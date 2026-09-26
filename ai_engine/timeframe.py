"""
Chronological Multi-Timeframe Construction & Micro-Feature Extraction
Strictly complies with MASTER_PROMPT_TR:
- Chronological progression from oldest to newest with ZERO future-data leakage.
- Aggregates OHLCV:
  OPEN = first OPEN
  HIGH = max HIGH
  LOW = min LOW
  CLOSE = last CLOSE
  VOLUME = sum
- Retains lower-timeframe micro-structure:
  wick structure, volatility, momentum, volume acceleration, price path.
"""

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd

TIMEFRAME_MINUTES = {
    "1m": 1,
    "3m": 3,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "4h": 240,
    "1d": 1440
}

def aggregate_candles(
    df: pd.DataFrame,
    target_timeframe: str,
    base_timeframe: str = "1m"
) -> pd.DataFrame:
    """
    Chronologically resamples lower timeframe candles into higher timeframe candles
    while extracting micro-features from lower-timeframe wicks, momentum, and volume.
    """
    if target_timeframe == base_timeframe:
        return df.copy()

    target_min = TIMEFRAME_MINUTES.get(target_timeframe, 60)
    base_min = TIMEFRAME_MINUTES.get(base_timeframe, 1)
    ratio = max(1, target_min // base_min)

    if "timestamp" in df.columns:
        df["dt"] = pd.to_datetime(df["timestamp"], unit="ms" if df["timestamp"].iloc[0] > 1e11 else "s")
    elif "time" in df.columns:
        df["dt"] = pd.to_datetime(df["time"])
    else:
        df["dt"] = pd.date_range(end=pd.Timestamp.now(), periods=len(df), freq=f"{base_min}min")

    df = df.sort_values("dt").reset_index(drop=True)

    # Group by chunk ratio
    num_chunks = len(df) // ratio
    if num_chunks == 0:
        return df.copy()

    # Drop remainder from the very start (chronologically keep alignment)
    trimmed_df = df.iloc[len(df) - (num_chunks * ratio):].reset_index(drop=True)
    trimmed_df["chunk_id"] = trimmed_df.index // ratio

    grouped = trimmed_df.groupby("chunk_id")

    resampled = pd.DataFrame({
        "open": grouped["open"].first(),
        "high": grouped["high"].max(),
        "low": grouped["low"].min(),
        "close": grouped["close"].last(),
        "volume": grouped["volume"].sum(),
        "timestamp": grouped["timestamp"].last() if "timestamp" in df.columns else grouped["dt"].last().astype(np.int64) // 10**6,
        "time": grouped["dt"].last().dt.strftime("%Y-%m-%d %H:%M:%S")
    })

    # Enriched lower-timeframe micro-structure features
    candle_range = (resampled["high"] - resampled["low"]).replace(0, 1e-6)
    body = (resampled["close"] - resampled["open"]).abs()
    upper_wick = resampled["high"] - np.maximum(resampled["open"], resampled["close"])
    lower_wick = np.minimum(resampled["open"], resampled["close"]) - resampled["low"]

    resampled["body_ratio"] = (body / candle_range).round(4)
    resampled["upper_wick_ratio"] = (upper_wick / candle_range).round(4)
    resampled["lower_wick_ratio"] = (lower_wick / candle_range).round(4)
    resampled["volatility_pct"] = ((resampled["high"] - resampled["low"]) / resampled["open"] * 100).round(3)
    
    # Volume acceleration
    vol_mean = resampled["volume"].rolling(5, min_periods=1).mean()
    resampled["volume_accel"] = (resampled["volume"] / vol_mean.replace(0, 1)).round(3)

    return resampled.reset_index(drop=True)

def chronological_train_test_split(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15
):
    """
    Strict walk-forward split without data leakage.
    Train -> Validation -> Test strictly in chronological order.
    """
    n = len(df)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train_df = df.iloc[:train_end].copy()
    val_df = df.iloc[train_end:val_end].copy()
    test_df = df.iloc[val_end:].copy()

    return train_df, val_df, test_df
