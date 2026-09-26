import pandas as pd
import numpy as np
from ai_engine.timeframe import aggregate_candles, chronological_train_test_split

def test_aggregate_candles():
    # 60 1m candles into 1h
    n = 120
    df = pd.DataFrame({
        "open": np.linspace(100, 110, n),
        "high": np.linspace(101, 112, n),
        "low": np.linspace(99, 109, n),
        "close": np.linspace(100.5, 111, n),
        "volume": np.ones(n) * 10,
        "timestamp": [1600000000 + i * 60 for i in range(n)]
    })

    res = aggregate_candles(df, target_timeframe="1h", base_timeframe="1m")
    assert len(res) == 2
    assert res["volume"].iloc[0] == 600
    assert "upper_wick_ratio" in res.columns
    assert "body_ratio" in res.columns

def test_chronological_split():
    df = pd.DataFrame({"val": range(100)})
    train, val, test = chronological_train_test_split(df, 0.7, 0.15)
    assert len(train) == 70
    assert len(val) == 15
    assert len(test) == 15
    # Strict chronological order
    assert train["val"].max() < val["val"].min()
    assert val["val"].max() < test["val"].min()
