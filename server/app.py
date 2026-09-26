"""
Futures AI FastAPI Backend Server
Serves:
1. Mobile Web UI (Single-Page App with live phone frame & full-screen modes)
2. All REST API endpoints for Futures Market Data, Training, Signals, Chart Indicators,
   Data Manager, Model Registry, Backtest, Paper Trading, and Structured Logging.
"""

from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import time
import pandas as pd
import numpy as np

from ai_engine.logger import logger, StructuredLogger
from ai_engine.data_manager import data_manager, SUPPORTED_SYMBOLS, SUPPORTED_TIMEFRAMES
from ai_engine.indicators import calculate_indicator
from ai_engine.models import model_registry, train_futures_model, TRAINING_PIPELINE_STEPS
from ai_engine.signal_engine import signal_engine
from ai_engine.backtest import backtest_engine, paper_trading

app = FastAPI(title="Futures AI Signal Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulated live state with random jitter for realistic crypto futures live feeds
LIVE_METRICS = {
    "BTCUSDT": {"price": 104250.0, "change_24h": 2.84, "high_24h": 105400.0, "low_24h": 101200.0, "funding": -0.0125, "oi": "2.84B", "vol_24h": "14.2B"},
    "ETHUSDT": {"price": 3480.5, "change_24h": 4.12, "high_24h": 3520.0, "low_24h": 3310.0, "funding": 0.0084, "oi": "1.12B", "vol_24h": "6.8B"},
    "SOLUSDT": {"price": 194.80, "change_24h": -1.45, "high_24h": 199.50, "low_24h": 191.20, "funding": 0.0350, "oi": "640M", "vol_24h": "3.1B"},
    "BNBUSDT": {"price": 625.40, "change_24h": 1.20, "high_24h": 632.0, "low_24h": 616.5, "funding": 0.0100, "oi": "310M", "vol_24h": "1.2B"},
    "AVAXUSDT": {"price": 34.25, "change_24h": 5.80, "high_24h": 35.10, "low_24h": 31.90, "funding": -0.0065, "oi": "145M", "vol_24h": "820M"},
    "XRPUSDT": {"price": 2.4580, "change_24h": -0.85, "high_24h": 2.5200, "low_24h": 2.3900, "funding": 0.0120, "oi": "890M", "vol_24h": "4.5B"}
}

# Request Schemas
class UIClickRequest(BaseModel):
    screen: str
    button: str
    context: Optional[Dict[str, Any]] = None

class TrainRequest(BaseModel):
    symbol: str
    timeframes: List[str]
    model_families: List[str]

class IndicatorRequest(BaseModel):
    symbol: str
    timeframe: str
    indicator: str
    settings: Optional[Dict[str, Any]] = None

class BacktestRequest(BaseModel):
    symbol: str
    timeframe: str = "15m"
    initial_capital: float = 10000.0
    leverage: int = 5
    risk_pct: float = 2.0

class PaperTradeRequest(BaseModel):
    signal_id: Optional[str] = None
    symbol: str = "BTCUSDT"
    direction: str = "LONG"
    entry_price: float = 100000.0
    tp2: Optional[float] = None
    sl: Optional[float] = None
    size_usdt: float = 1000.0
    leverage: int = 10

# API Endpoints
@app.post("/api/ui/click")
def log_ui_click(req: UIClickRequest):
    """Log user interactions as required by Master Prompt."""
    logger.log(
        category="UI",
        severity="INFO",
        message=f"UI-CLICK: screen={req.screen} button={req.button}",
        code="UI-1001",
        context={"screen": req.screen, "button": req.button, **(req.context or {})}
    )
    return {"status": "logged"}

@app.get("/api/market/ticker")
def get_ticker(symbol: str = "BTCUSDT"):
    base = LIVE_METRICS.get(symbol, LIVE_METRICS["BTCUSDT"])
    # Jitter slightly for live feel
    jitter = np.random.normal(0, 0.0003) * base["price"]
    price = round(base["price"] + jitter, 2 if base["price"] > 10 else 4)
    return {
        "symbol": symbol,
        "price": price,
        "change_24h": base["change_24h"],
        "high_24h": base["high_24h"],
        "low_24h": base["low_24h"],
        "funding_rate": base["funding"],
        "open_interest": base["oi"],
        "volume_24h": base["vol_24h"],
        "stream_status": "ONLINE (24ms)",
        "timestamp": int(time.time() * 1000)
    }

@app.get("/api/market/all-tickers")
def get_all_tickers():
    return [
        {
            "symbol": sym,
            **meta
        }
        for sym, meta in LIVE_METRICS.items()
    ]

@app.get("/api/market/candles")
def get_candles(symbol: str = "BTCUSDT", timeframe: str = "15m", limit: int = 150):
    df = data_manager.load_candles(symbol, timeframe, limit=limit)
    candles = []
    for _, r in df.iterrows():
        candles.append({
            "time": r["time"],
            "timestamp": int(r["timestamp"]),
            "open": float(r["open"]),
            "high": float(r["high"]),
            "low": float(r["low"]),
            "close": float(r["close"]),
            "volume": float(r["volume"])
        })
    return {"symbol": symbol, "timeframe": timeframe, "candles": candles}

@app.post("/api/market/indicator")
def get_indicator(req: IndicatorRequest):
    df = data_manager.load_candles(req.symbol, req.timeframe, limit=200)
    try:
        res = calculate_indicator(df, req.indicator, req.settings)
        return {"symbol": req.symbol, "timeframe": req.timeframe, "indicator": res}
    except Exception as e:
        logger.log("INDICATOR", "ERROR", f"Indicator calc error: {str(e)}", code="FEATURE-5001")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/signals/active")
def get_active_signals(direction: str = "ALL", min_score: int = 0):
    return signal_engine.get_signals(status="ACTIVE", direction=direction, min_score=min_score)

@app.get("/api/signals/history")
def get_signal_history():
    return signal_engine.get_signals()

@app.post("/api/signals/scan")
def scan_signals(symbol: str = "BTCUSDT", timeframe: str = "15m"):
    logger.log("SIGNAL", "INFO", f"Scanning Futures Signal for {symbol} {timeframe}", code="SIGNAL-8001")
    df = data_manager.load_candles(symbol, timeframe, limit=100)
    sig = signal_engine.generate_signal(df, symbol, timeframe)
    return sig

@app.get("/api/training/steps")
def get_training_steps():
    return TRAINING_PIPELINE_STEPS

@app.post("/api/training/start")
def start_training(req: TrainRequest):
    logger.log("TRAINING", "INFO", f"Starting training pipeline for {req.symbol}", code="TRAIN-6001", context=req.model_dump())
    df = data_manager.load_candles(req.symbol, req.timeframes[0] if req.timeframes else "15m", limit=400)
    result = train_futures_model(df, req.symbol, req.timeframes, req.model_families)
    return result

@app.get("/api/data/status")
def get_data_status():
    return data_manager.get_status()

@app.post("/api/data/sync")
def sync_data(symbols: Optional[List[str]] = None, timeframes: Optional[List[str]] = None):
    return data_manager.sync_data(symbols, timeframes)

@app.get("/api/models")
def get_models():
    return model_registry.get_models()

@app.post("/api/backtest/run")
def run_backtest(req: BacktestRequest):
    df = data_manager.load_candles(req.symbol, req.timeframe, limit=300)
    res = backtest_engine.run_backtest(
        df,
        symbol=req.symbol,
        initial_capital=req.initial_capital,
        leverage=req.leverage,
        risk_per_trade_pct=req.risk_pct
    )
    return res

@app.get("/api/paper-trading")
def get_paper_trading():
    return paper_trading.get_state()

@app.post("/api/paper-trading/execute")
def execute_paper_trade(req: PaperTradeRequest):
    res = paper_trading.execute_signal(
        signal={
            "symbol": req.symbol,
            "direction": req.direction,
            "entry_price": req.entry_price,
            "tp2": req.tp2,
            "sl": req.sl
        },
        size_usdt=req.size_usdt,
        leverage=req.leverage
    )
    return res

@app.post("/api/paper-trading/close/{pos_id}")
def close_paper_trade(pos_id: str):
    return paper_trading.close_position(pos_id)

@app.get("/api/logs")
def get_logs(
    category: Optional[str] = "ALL",
    severity: Optional[str] = "ALL",
    search: Optional[str] = None,
    limit: int = 150
):
    return logger.get_logs(category=category, severity=severity, search=search, limit=limit)

@app.get("/api/logs/export")
def export_logs(format: str = "json"):
    content = logger.export(format)
    media_type = "application/json" if format == "json" else ("text/csv" if format == "csv" else "text/plain")
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=futures_ai_logs.{format}"}
    )

# Mount static web UI at root /
WEB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")
if os.path.exists(WEB_DIR):
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.app:app", host="0.0.0.0", port=8000, reload=False)
