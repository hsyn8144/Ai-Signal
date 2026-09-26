import pytest
import pandas as pd
import numpy as np

from ai_engine.indicators import (
    calculate_ema, calculate_vwap, calculate_bollinger_bands,
    calculate_rsi, calculate_macd, calculate_indicator
)

@pytest.fixture
def sample_ohlcv():
    n = 60
    np.random.seed(42)
    prices = 100.0 + np.cumsum(np.random.normal(0, 1, n))
    df = pd.DataFrame({
        "open": prices * 0.999,
        "high": prices * 1.005,
        "low": prices * 0.995,
        "close": prices,
        "volume": np.random.uniform(10, 100, n),
        "timestamp": list(range(n))
    })
    return df

def test_calculate_ema(sample_ohlcv):
    res = calculate_ema(sample_ohlcv, period=10)
    assert res["name"] == "EMA_10"
    assert res["type"] == "overlay"
    assert len(res["values"]) == len(sample_ohlcv)
    assert res["values"][-1] is not None

def test_calculate_rsi(sample_ohlcv):
    res = calculate_rsi(sample_ohlcv, period=14)
    assert res["name"] == "RSI_14"
    assert res["type"] == "panel"
    assert len(res["values"]) == len(sample_ohlcv)
    assert 0 <= res["values"][-1] <= 100

def test_calculate_macd(sample_ohlcv):
    res = calculate_macd(sample_ohlcv, fast=12, slow=26, signal=9)
    assert "macd" in res and "signal" in res and "hist" in res
    assert len(res["macd"]) == len(sample_ohlcv)

def test_standard_interface(sample_ohlcv):
    res = calculate_indicator(sample_ohlcv, "BB", {"period": 20, "std_dev": 2.0})
    assert "middle" in res and "upper" in res and "lower" in res
