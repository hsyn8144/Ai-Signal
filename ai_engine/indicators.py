"""
Python Indicator Engine for Futures AI
Standard Interface:
calculate_indicator(data: pd.DataFrame, indicator_name: str, settings: dict) -> dict
Indicators are calculated in Python, returning clean structured series for mobile chart rendering.
"""

from typing import Dict, Any, List, Union
import numpy as np
import pandas as pd

def calculate_ema(data: pd.DataFrame, period: int = 20, column: str = "close") -> Dict[str, Any]:
    series = data[column].ewm(span=period, adjust=False).mean()
    return {
        "name": f"EMA_{period}",
        "type": "overlay",
        "values": series.replace({np.nan: None}).tolist()
    }

def calculate_sma(data: pd.DataFrame, period: int = 20, column: str = "close") -> Dict[str, Any]:
    series = data[column].rolling(window=period).mean()
    return {
        "name": f"SMA_{period}",
        "type": "overlay",
        "values": series.replace({np.nan: None}).tolist()
    }

def calculate_vwap(data: pd.DataFrame) -> Dict[str, Any]:
    typical_price = (data["high"] + data["low"] + data["close"]) / 3.0
    vol = data["volume"]
    cum_vol_price = (typical_price * vol).cumsum()
    cum_vol = vol.cumsum().replace(0, np.nan)
    vwap_series = cum_vol_price / cum_vol
    return {
        "name": "VWAP",
        "type": "overlay",
        "values": vwap_series.replace({np.nan: None}).tolist()
    }

def calculate_bollinger_bands(data: pd.DataFrame, period: int = 20, std_dev: float = 2.0) -> Dict[str, Any]:
    close = data["close"]
    middle = close.rolling(window=period).mean()
    std = close.rolling(window=period).std()
    upper = middle + (std * std_dev)
    lower = middle - (std * std_dev)
    bandwidth = ((upper - lower) / middle) * 100
    return {
        "name": f"BB_{period}_{std_dev}",
        "type": "overlay",
        "middle": middle.replace({np.nan: None}).tolist(),
        "upper": upper.replace({np.nan: None}).tolist(),
        "lower": lower.replace({np.nan: None}).tolist(),
        "bandwidth": bandwidth.replace({np.nan: None}).tolist()
    }

def calculate_atr(data: pd.DataFrame, period: int = 14) -> Dict[str, Any]:
    high = data["high"]
    low = data["low"]
    close = data["close"]
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.ewm(span=period, adjust=False).mean()
    return {
        "name": f"ATR_{period}",
        "type": "panel",
        "values": atr.replace({np.nan: None}).tolist()
    }

def calculate_supertrend(data: pd.DataFrame, period: int = 10, multiplier: float = 3.0) -> Dict[str, Any]:
    high = data["high"]
    low = data["low"]
    close = data["close"]
    
    # Calculate ATR
    prev_close = close.shift(1)
    tr = pd.concat([high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()

    hl2 = (high + low) / 2.0
    basic_upper = hl2 + (multiplier * atr)
    basic_lower = hl2 - (multiplier * atr)
    
    final_upper = basic_upper.copy()
    final_lower = basic_lower.copy()
    supertrend = pd.Series(index=data.index, dtype=float)
    direction = pd.Series(index=data.index, dtype=int)
    
    curr_dir = 1
    for i in range(1, len(data)):
        if basic_upper.iloc[i] < final_upper.iloc[i-1] or close.iloc[i-1] > final_upper.iloc[i-1]:
            final_upper.iloc[i] = basic_upper.iloc[i]
        else:
            final_upper.iloc[i] = final_upper.iloc[i-1]

        if basic_lower.iloc[i] > final_lower.iloc[i-1] or close.iloc[i-1] < final_lower.iloc[i-1]:
            final_lower.iloc[i] = basic_lower.iloc[i]
        else:
            final_lower.iloc[i] = final_lower.iloc[i-1]

        if curr_dir == 1:
            if close.iloc[i] <= final_lower.iloc[i]:
                curr_dir = -1
                supertrend.iloc[i] = final_upper.iloc[i]
            else:
                supertrend.iloc[i] = final_lower.iloc[i]
        else:
            if close.iloc[i] >= final_upper.iloc[i]:
                curr_dir = 1
                supertrend.iloc[i] = final_lower.iloc[i]
            else:
                supertrend.iloc[i] = final_upper.iloc[i]
        direction.iloc[i] = curr_dir

    return {
        "name": f"SuperTrend_{period}_{multiplier}",
        "type": "overlay",
        "values": supertrend.replace({np.nan: None}).tolist(),
        "direction": direction.replace({np.nan: 1}).tolist()
    }

def calculate_rsi(data: pd.DataFrame, period: int = 14) -> Dict[str, Any]:
    delta = data["close"].diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    rsi = rsi.fillna(50.0)

    return {
        "name": f"RSI_{period}",
        "type": "panel",
        "values": rsi.round(2).tolist()
    }

def calculate_macd(data: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, Any]:
    close = data["close"]
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    hist = macd_line - signal_line

    return {
        "name": f"MACD_{fast}_{slow}_{signal}",
        "type": "panel",
        "macd": macd_line.replace({np.nan: None}).tolist(),
        "signal": signal_line.replace({np.nan: None}).tolist(),
        "hist": hist.replace({np.nan: None}).tolist()
    }

def calculate_stochastic(data: pd.DataFrame, k_period: int = 14, d_period: int = 3) -> Dict[str, Any]:
    low_min = data["low"].rolling(window=k_period).min()
    high_max = data["high"].rolling(window=k_period).max()
    denom = (high_max - low_min).replace(0, np.nan)
    k = 100 * ((data["close"] - low_min) / denom)
    d = k.rolling(window=d_period).mean()
    return {
        "name": f"STOCH_{k_period}_{d_period}",
        "type": "panel",
        "k": k.replace({np.nan: 50.0}).round(2).tolist(),
        "d": d.replace({np.nan: 50.0}).round(2).tolist()
    }

def calculate_obv(data: pd.DataFrame) -> Dict[str, Any]:
    diff = data["close"].diff()
    direction = np.where(diff > 0, 1, np.where(diff < 0, -1, 0))
    volume = data["volume"] * direction
    obv = volume.cumsum()
    return {
        "name": "OBV",
        "type": "panel",
        "values": obv.replace({np.nan: 0}).tolist()
    }

def detect_fvg_and_liquidity(data: pd.DataFrame) -> Dict[str, Any]:
    """Detect Fair Value Gaps (Bullish & Bearish) and Liquidity Sweeps."""
    fvg_bullish = []
    fvg_bearish = []
    sweeps = []

    if len(data) >= 3:
        for i in range(2, len(data)):
            # Bullish FVG: Low of candle i > High of candle i-2
            if data["low"].iloc[i] > data["high"].iloc[i-2]:
                fvg_bullish.append({
                    "index": i-1,
                    "top": float(data["low"].iloc[i]),
                    "bottom": float(data["high"].iloc[i-2]),
                    "timestamp": str(data["time"].iloc[i-1]) if "time" in data else str(i-1)
                })
            # Bearish FVG: High of candle i < Low of candle i-2
            elif data["high"].iloc[i] < data["low"].iloc[i-2]:
                fvg_bearish.append({
                    "index": i-1,
                    "top": float(data["low"].iloc[i-2]),
                    "bottom": float(data["high"].iloc[i]),
                    "timestamp": str(data["time"].iloc[i-1]) if "time" in data else str(i-1)
                })

    return {
        "name": "SMC_Structure",
        "type": "overlay",
        "bullish_fvg": fvg_bullish[-10:],
        "bearish_fvg": fvg_bearish[-10:]
    }

def calculate_indicator(data: pd.DataFrame, indicator_name: str, settings: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Standard interface required by Master Prompt:
    calculate_indicator(data, settings) -> result
    """
    settings = settings or {}
    name = indicator_name.upper()

    if name == "EMA":
        period = int(settings.get("period", 20))
        return calculate_ema(data, period=period)
    elif name == "SMA":
        period = int(settings.get("period", 20))
        return calculate_sma(data, period=period)
    elif name == "VWAP":
        return calculate_vwap(data)
    elif name in ["BB", "BOLLINGER", "BOLLINGER_BANDS"]:
        period = int(settings.get("period", 20))
        std = float(settings.get("std_dev", 2.0))
        return calculate_bollinger_bands(data, period=period, std_dev=std)
    elif name in ["SUPERTREND", "SUPER_TREND"]:
        period = int(settings.get("period", 10))
        multiplier = float(settings.get("multiplier", 3.0))
        return calculate_supertrend(data, period=period, multiplier=multiplier)
    elif name == "RSI":
        period = int(settings.get("period", 14))
        return calculate_rsi(data, period=period)
    elif name == "MACD":
        fast = int(settings.get("fast", 12))
        slow = int(settings.get("slow", 26))
        sig = int(settings.get("signal", 9))
        return calculate_macd(data, fast=fast, slow=slow, signal=sig)
    elif name in ["STOCH", "STOCHASTIC"]:
        k = int(settings.get("k_period", 14))
        d = int(settings.get("d_period", 3))
        return calculate_stochastic(data, k_period=k, d_period=d)
    elif name == "ATR":
        period = int(settings.get("period", 14))
        return calculate_atr(data, period=period)
    elif name == "OBV":
        return calculate_obv(data)
    elif name in ["SMC", "FVG"]:
        return detect_fvg_and_liquidity(data)
    else:
        raise ValueError(f"Unknown indicator: {indicator_name}")
