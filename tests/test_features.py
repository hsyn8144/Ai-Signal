import pytest
import pandas as pd
import numpy as np

from ai_engine.feature_extractor import (
    extract_candle_anatomy,
    extract_smc_and_price_action,
    extract_futures_derivatives_metrics,
    extract_volume_and_order_flow,
    extract_advanced_volatility,
    generate_triple_barrier_labels,
    extract_full_futures_feature_matrix
)

@pytest.fixture
def sample_futures_df():
    n = 80
    np.random.seed(42)
    prices = 100.0 + np.cumsum(np.random.normal(0, 1, n))
    return pd.DataFrame({
        "open": prices * 0.998,
        "high": prices * 1.006,
        "low": prices * 0.994,
        "close": prices,
        "volume": np.random.uniform(50, 200, n),
        "timestamp": list(range(n))
    })

def test_extract_candle_anatomy(sample_futures_df):
    res = extract_candle_anatomy(sample_futures_df)
    assert "upper_wick_ratio" in res.columns
    assert "lower_wick_ratio" in res.columns
    assert "body_ratio" in res.columns
    assert "wick_asymmetry" in res.columns
    assert len(res) == len(sample_futures_df)

def test_extract_smc_and_price_action(sample_futures_df):
    res = extract_smc_and_price_action(sample_futures_df)
    assert "fvg_bull_strength" in res.columns
    assert "liquidity_sweep_high" in res.columns
    assert "bos_bullish" in res.columns

def test_extract_futures_derivatives_metrics(sample_futures_df):
    res = extract_futures_derivatives_metrics(sample_futures_df)
    assert "funding_rate" in res.columns
    assert "funding_zscore" in res.columns
    assert "squeeze_opportunity" in res.columns
    assert "oi_momentum" in res.columns

def test_triple_barrier_labels(sample_futures_df):
    labels = generate_triple_barrier_labels(sample_futures_df)
    assert "target_direction" in labels.columns
    assert "tp1_achieved" in labels.columns
    assert set(labels["target_direction"].unique()).issubset({-1, 0, 1})

def test_full_matrix(sample_futures_df):
    X, y = extract_full_futures_feature_matrix(sample_futures_df)
    assert len(X) == len(sample_futures_df)
    assert len(y) == len(sample_futures_df)
    assert X.shape[1] >= 15
