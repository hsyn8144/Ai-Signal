import pandas as pd
import numpy as np
from ai_engine.signal_engine import SignalEngine
from ai_engine.backtest import FuturesBacktestEngine

def test_signal_engine_structure():
    engine = SignalEngine(db_path=":memory:")
    signals = engine.get_signals()
    assert len(signals) >= 3
    sig = signals[0]
    assert sig["direction"] in ["LONG", "SHORT", "WAIT"]
    assert sig["score"] >= 80
    assert "tp1" in sig and "tp2" in sig and "sl" in sig
    assert "tp1_prob" in sig and "tp2_prob" in sig and "sl_prob" in sig
    assert sig["expected_duration"] is not None
    assert sig["market_regime"] is not None

def test_backtest_fees_and_slippage():
    engine = FuturesBacktestEngine()
    n = 100
    df = pd.DataFrame({
        "open": np.linspace(100, 110, n),
        "high": np.linspace(101, 112, n),
        "low": np.linspace(99, 109, n),
        "close": np.linspace(100.5, 111, n),
        "volume": np.ones(n) * 100,
        "timestamp": [1600000000 + i * 900 for i in range(n)]
    })
    res = engine.run_backtest(df, symbol="BTCUSDT", initial_capital=10000.0)
    assert "net_pnl" in res
    assert "total_fees" in res
    assert "total_slippage" in res
    assert "win_rate" in res
    assert "profit_factor" in res
