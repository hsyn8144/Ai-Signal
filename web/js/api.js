/**
 * Futures AI REST & Stream Client
 * Connects to /api/... with graceful mock fallbacks
 */

const API_BASE = "";

class FuturesApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    try {
      const resp = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      return await resp.json();
    } catch (err) {
      console.warn(`[API] Fallback for ${endpoint}:`, err.message);
      return this.getFallback(endpoint, options);
    }
  }

  async logClick(screen, button, context = {}) {
    try {
      await fetch(`${API_BASE}/api/ui/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screen, button, context })
      });
    } catch (e) {
      // Non-blocking log
    }
  }

  getTicker(symbol = "BTCUSDT") {
    return this.request(`/api/market/ticker?symbol=${encodeURIComponent(symbol)}`);
  }

  getCandles(symbol = "BTCUSDT", timeframe = "15m", limit = 150) {
    return this.request(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`);
  }

  getActiveSignals(direction = "ALL", minScore = 0) {
    return this.request(`/api/signals/active?direction=${direction}&min_score=${minScore}`);
  }

  scanSignals(symbol = "BTCUSDT", timeframe = "15m") {
    return this.request(`/api/signals/scan?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`, {
      method: "POST"
    });
  }

  startTraining(payload) {
    return this.request(`/api/training/start`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  getDataStatus() {
    return this.request(`/api/data/status`);
  }

  syncData(symbols, timeframes) {
    return this.request(`/api/data/sync`, {
      method: "POST",
      body: JSON.stringify({ symbols, timeframes })
    });
  }

  getModels() {
    return this.request(`/api/models`);
  }

  runBacktest(payload) {
    return this.request(`/api/backtest/run`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  getPaperTrading() {
    return this.request(`/api/paper-trading`);
  }

  executePaperTrade(payload) {
    return this.request(`/api/paper-trading/execute`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  closePaperTrade(posId) {
    return this.request(`/api/paper-trading/close/${posId}`, {
      method: "POST"
    });
  }

  getLogs(category = "ALL", severity = "ALL", search = "") {
    let q = `/api/logs?category=${category}&severity=${severity}`;
    if (search) q += `&search=${encodeURIComponent(search)}`;
    return this.request(q);
  }

  getFallback(endpoint, options) {
    if (endpoint.includes("/ticker")) {
      return {
        symbol: "BTCUSDT",
        price: 104250.0,
        change_24h: 2.84,
        high_24h: 105400.0,
        low_24h: 101200.0,
        funding_rate: -0.0125,
        open_interest: "2.84B",
        volume_24h: "14.2B",
        stream_status: "FALLBACK"
      };
    }
    if (endpoint.includes("/candles")) {
      const candles = [];
      let p = 104000;
      const now = Date.now();
      for (let i = 0; i < 100; i++) {
        const o = p;
        const c = p + (Math.random() - 0.49) * 300;
        const h = Math.max(o, c) + Math.random() * 150;
        const l = Math.min(o, c) - Math.random() * 150;
        p = c;
        candles.push({
          time: new Date(now - (100 - i) * 15 * 60000).toISOString(),
          open: o, high: h, low: l, close: c,
          volume: 80 + Math.random() * 200
        });
      }
      return { candles };
    }
    return {};
  }
}

window.apiClient = new FuturesApiClient();
