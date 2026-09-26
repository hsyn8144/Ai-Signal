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
    // Always record into local structured log buffer (visible in Logs screen)
    try {
      if (!this.mockState) this.mockState = this.buildMockState();
      this.mockState.logs.push({
        timestamp: new Date().toISOString(),
        category: "UI",
        severity: "INFO",
        code: "UI-1001",
        message: `UI-CLICK screen=${screen} button=${button} ${JSON.stringify(context)}`
      });
      if (this.mockState.logs.length > 250) this.mockState.logs.splice(0, this.mockState.logs.length - 250);
    } catch (e) { /* non-blocking */ }
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
    // ---------- MOCK ENGINE: offline / APK demo data ----------
    if (!this.mockState) this.mockState = this.buildMockState();

    const st = this.mockState;

    if (endpoint.includes("/ticker")) {
      const m = endpoint.match(/symbol=([A-Z0-9]+)/);
      const symbol = m ? m[1] : "BTCUSDT";
      const base = st.prices[symbol] != null ? st.prices[symbol] : st.prices.BTCUSDT;
      // Smooth live drift each poll
      const drift = (Math.random() - 0.5) * base * 0.0012;
      st.prices[symbol] = base + drift;
      return {
        symbol,
        price: st.prices[symbol],
        change_24h: Math.round(st.changes[symbol] * 100) / 100,
        high_24h: st.prices[symbol] * 1.011,
        low_24h: st.prices[symbol] * 0.987,
        funding_rate: st.funding[symbol],
        open_interest: st.oi[symbol],
        volume_24h: st.vol[symbol],
        stream_status: "FALLBACK"
      };
    }

    if (endpoint.includes("/candles")) {
      const m = endpoint.match(/symbol=([A-Z0-9]+)/);
      const symbol = m ? m[1] : "BTCUSDT";
      const tm = endpoint.match(/timeframe=([0-9a-zA-Z]+)/);
      const tf = tm ? tm[1] : "15m";
      const candles = [];
      let p = st.prices[symbol] != null ? st.prices[symbol] * 0.988 : 102800;
      const now = Date.now();
      const tfMs = { "1m": 60000, "3m": 180000, "5m": 300000, "15m": 900000, "30m": 1800000, "1h": 3600000, "4h": 14400000, "1d": 86400000 }[tf] || 900000;
      for (let i = 0; i < 120; i++) {
        const o = p;
        const c = p + (Math.random() - 0.485) * p * 0.0032;
        const h = Math.max(o, c) + Math.random() * p * 0.0015;
        const l = Math.min(o, c) - Math.random() * p * 0.0015;
        p = c;
        candles.push({
          time: new Date(now - (120 - i) * tfMs).toISOString(),
          open: o, high: h, low: l, close: c,
          volume: 80 + Math.random() * 220
        });
      }
      return { candles };
    }

    if (endpoint.includes("/signals/scan")) {
      return { scanned: true, found: 1, radar: "NEON_ORBIT", new_signal_id: st.signals[0].id };
    }

    if (endpoint.includes("/signals/active")) {
      const dm = endpoint.match(/direction=([A-Z]+)/);
      const sm = endpoint.match(/min_score=(\d+)/);
      const dir = dm ? dm[1] : "ALL";
      const minScore = sm ? parseInt(sm[1]) : 0;
      return st.signals.filter(s =>
        (dir === "ALL" || s.direction === dir) && s.score >= minScore
      );
    }

    if (endpoint.includes("/training/start")) {
      return {
        training_id: "TR-" + (Date.now() % 1000000),
        metrics: {
          win_rate: Math.round((62 + Math.random() * 5) * 10) / 10,
          profit_factor: Math.round((1.75 + Math.random() * 0.35) * 100) / 100,
          sharpe_ratio: Math.round((1.8 + Math.random() * 0.4) * 100) / 100,
          max_drawdown: Math.round((7.2 + Math.random() * 2.4) * 10) / 10
        },
        registration: {
          version: "v1.5.0",
          status: "ACCEPTED",
          decision: "Yeni şampiyon model kaydedildi (önceki: v1.4.1)"
        }
      };
    }

    if (endpoint.includes("/data/status")) {
      return st.dataStatus;
    }

    if (endpoint.includes("/data/sync")) {
      return { ok: true, synced: true, message: "Parquet bölümleri senkronize edildi" };
    }

    if (endpoint.includes("/models")) {
      return st.models;
    }

    if (endpoint.includes("/backtest/run")) {
      return {
        net_pnl: Math.round((2650 + Math.random() * 400) * 10) / 10,
        net_return_pct: Math.round((26 + Math.random() * 5) * 10) / 10,
        win_rate: 64.2,
        profit_factor: 1.87,
        max_drawdown: 8.4,
        total_fees: Math.round((300 + Math.random() * 30) * 10) / 10,
        total_slippage: Math.round((80 + Math.random() * 15) * 10) / 10,
        sharpe_ratio: 1.92,
        sortino_ratio: 2.64
      };
    }

    if (endpoint.includes("/paper-trading/execute")) {
      let payload = {};
      try { payload = JSON.parse(options.body || "{}"); } catch (e) { }
      const pos = {
        id: "POS-" + String(st.positions.length + 1).padStart(3, "0"),
        symbol: payload.symbol || "BTCUSDT",
        side: payload.direction || "LONG",
        leverage: payload.leverage || 10,
        unrealized_pnl: 0,
        pnl_pct: 0,
        entry_price: payload.entry_price || st.prices.BTCUSDT,
        liquidation_price: Math.round((payload.entry_price || 104250) * (payload.direction === "SHORT" ? 1.10 : 0.90)),
        tp: payload.tp2 || (payload.entry_price || 104250) * 1.009,
        sl: payload.sl || (payload.entry_price || 104250) * 0.996
      };
      st.positions.push(pos);
      return pos;
    }

    if (endpoint.includes("/paper-trading/close/")) {
      const idm = endpoint.match(/close\/([A-Za-z0-9-]+)/);
      if (idm) st.positions = st.positions.filter(p => p.id !== idm[1]);
      return { ok: true };
    }

    if (endpoint.includes("/paper-trading")) {
      return {
        equity: 10000,
        used_margin: st.positions.reduce((a, p) => a + (p.entry_price * 0.1), 0),
        positions: st.positions.map(p => ({ ...p }))
      };
    }

    if (endpoint.includes("/logs/export")) {
      return {};
    }

    if (endpoint.includes("/logs")) {
      const cm = endpoint.match(/category=([A-Z_]+)/);
      const sm2 = endpoint.match(/search=([^&]*)/);
      const cat = cm ? cm[1] : "ALL";
      const search = sm2 ? decodeURIComponent(sm2[1]) : "";
      return st.logs.filter(l =>
        (cat === "ALL" || l.category === cat) &&
        (!search || l.message.toLowerCase().includes(search.toLowerCase()))
      );
    }

    return {};
  }

  buildMockState() {
    const prices = {
      BTCUSDT: 104250, ETHUSDT: 3428.4, SOLUSDT: 216.42,
      BNBUSDT: 708.2, AVAXUSDT: 41.86, XRPUSDT: 2.3421
    };
    const changes = { BTCUSDT: 2.84, ETHUSDT: 1.92, SOLUSDT: -1.24, BNBUSDT: 0.86, AVAXUSDT: -2.18, XRPUSDT: 3.42 };
    const funding = { BTCUSDT: -0.0125, ETHUSDT: -0.0084, SOLUSDT: 0.0214, BNBUSDT: -0.0032, AVAXUSDT: 0.0158, XRPUSDT: -0.0212 };
    const oi = { BTCUSDT: "2.84B", ETHUSDT: "1.12B", SOLUSDT: "482M", BNBUSDT: "318M", AVAXUSDT: "142M", XRPUSDT: "392M" };
    const vol = { BTCUSDT: "14.2B", ETHUSDT: "8.4B", SOLUSDT: "2.1B", BNBUSDT: "982M", AVAXUSDT: "412M", XRPUSDT: "1.28B" };

    const sig = (id, symbol, tf, dir, score, entry, tp1, tp2, sl, p1, p2, ps, rr, dur, regime, rat, mag, sess, hurst) => ({
      id, symbol, timeframe: tf, direction: dir, score, entry_price: entry,
      tp1, tp2, sl, tp1_prob: p1, tp2_prob: p2, sl_prob: ps, risk_reward: rr,
      expected_duration: dur, market_regime: regime, rationale: rat,
      leverage: "5x - 10x", kelly_fraction_pct: "3.8",
      liq_magnet_level: mag, active_session: sess, hurst_regime: hurst
    });

    const signals = [
      sig("SIG-1042", "BTCUSDT", "15m", "LONG", 88, 104250, 104720, 105180, 103820, 81, 63, 17, 2.8,
        "8-18 dk", "BULLISH",
        "4h yapısal yükseliş + 15m FVG dengesi. Fonlama sıkışması (negative funding) short tasfiyelerini tetikleyebilir; emir akışı alıcı lehine.",
        "105,400", "LONDRA", "TRENDING (H=0.62)"),
      sig("SIG-1043", "ETHUSDT", "1h", "SHORT", 84, 3428, 3388, 3341, 3462, 78, 58, 21, 2.4,
        "22-45 dk", "BEARISH",
        "1h direnç bölgesi reddi + RSI negatif uyumsuzluk. Likidite havuzu 3,341 altında yoğunlaşıyor.",
        "3,341", "NEW YORK", "MEAN-REVERT (H=0.41)"),
      sig("SIG-1044", "XRPUSDT", "15m", "LONG", 86, 2.3421, 2.3980, 2.4410, 2.3050, 80, 61, 18, 2.7,
        "12-25 dk", "BULLISH",
        "Hacim ivmesi + 15m kırılım sonrası retest onayı. OI artışı yeni long girişlerini doğruluyor.",
        "2.4410", "LONDRA", "TRENDING (H=0.59)"),
      sig("SIG-1045", "SOLUSDT", "30m", "SHORT", 81, 216.42, 211.80, 207.40, 220.10, 76, 55, 23, 2.2,
        "30-60 dk", "BEARISH",
        "4h yapısal kırılım sonrası 30m retracement satışı. SuperTrend kısa vadede ayı lehine döndü.",
        "207.40", "ASYA", "MEAN-REVERT (H=0.44)"),
      sig("SIG-1046", "BNBUSDT", "1h", "LONG", 79, 708.2, 718.4, 729.8, 700.1, 74, 52, 25, 2.1,
        "1-3 saat", "BULLISH",
        "Günlük destekten dönüş + VWAP üzerinde kalıcılık. MACD histogramı pozitife döndü.",
        "729.80", "NEW YORK", "TRENDING (H=0.57)"),
      sig("SIG-1047", "AVAXUSDT", "15m", "SHORT", 77, 41.86, 40.92, 40.12, 42.55, 72, 50, 26, 2.0,
        "15-35 dk", "RANGE",
        "Arz bölgesi reddi + hacim profili tepe noktası. Sipariş defterinde satıcı duvarı belirgin.",
        "40.12", "ASYA", "MEAN-REVERT (H=0.46)")
    ];

    const tfs = ["15m", "1h", "4h"];
    const syms = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "AVAXUSDT", "XRPUSDT"];
    const dataStatus = [];
    syms.forEach((s, si) => tfs.forEach((t, ti) => {
      dataStatus.push({
        symbol: s, timeframe: t,
        status: (si + ti) % 7 === 3 ? "MISSING" : "SYNCED",
        total_candles: 8000 + si * 1200 + ti * 3400,
        size_kb: 420 + si * 65 + ti * 180
      });
    }));

    const models = [
      { version: "v1.4.1", family: "LightGBM + LSTM Ensemble", timeframe: "15m / 1h", status: "ACTIVE", win_rate: 64.2, profit_factor: 1.87, sharpe_ratio: 1.92, max_drawdown: 8.4 },
      { version: "v1.5.0-rc2", family: "XGBoost + GRU", timeframe: "15m / 1h", status: "CANDIDATE", win_rate: 66.1, profit_factor: 1.94, sharpe_ratio: 2.01, max_drawdown: 7.9 },
      { version: "v1.3.8", family: "Random Forest", timeframe: "1h", status: "REJECTED", win_rate: 58.9, profit_factor: 1.42, sharpe_ratio: 1.21, max_drawdown: 12.6 },
      { version: "v1.2.0", family: "Logistic Regression", timeframe: "15m", status: "REJECTED", win_rate: 55.2, profit_factor: 1.18, sharpe_ratio: 0.84, max_drawdown: 15.1 }
    ];

    const logDefs = [
      ["SYSTEM", "INFO", "", "Futures AI Motoru başlatıldı • Binance USDT-M"],
      ["ANDROID", "INFO", "", "WebView kabuk başlatıldı • APK modu etkin"],
      ["DATA", "INFO", "DATA-2001", "Parquet bölümleri doğrulandı: data/BTCUSDT/15m/"],
      ["PARQUET", "INFO", "", "12,480 mum yüklendi (15m) • 1.8 MB"],
      ["BINANCE", "INFO", "", "fapi.binance.com REST bağlantısı kuruldu (fallback moda düştü)"],
      ["WEBSOCKET", "INFO", "WS-3101", "WS stream yeniden bağlanıyor... (offline demo modu)"],
      ["FEATURE", "INFO", "FEATURE-5001", "42 özellik vektörü hesaplandı (fitil, volatilite, momentum)"],
      ["INDICATOR", "INFO", "", "EMA20/50, BB, RSI(14), MACD hesaplandı"],
      ["LABEL", "INFO", "", "Çok ufuklu TP1/TP2/SL etiketleme tamamlandı"],
      ["TRAINING", "INFO", "TRAIN-6001", "LightGBM eğitimi başladı • TR-000042"],
      ["TRAINING", "INFO", "", "LSTM eğitimi epok 12/30 • loss 0.284"],
      ["VALIDATION", "INFO", "", "Walk-forward pencere 4/8 tamamlandı • AUC 0.71"],
      ["BACKTEST", "INFO", "", "Backtest: 342 işlem • Net PnL +2,841 USDT"],
      ["MODEL", "INFO", "MODEL-7001", "Model v1.4.1 şampiyon olarak korundu"],
      ["MODEL_REGISTRY", "INFO", "", "v1.5.0-rc2 CANDIDATE olarak kaydedildi"],
      ["SIGNAL", "INFO", "SIGNAL-8001", "Yeni sinyal: BTCUSDT LONG • Skor 88/100"],
      ["SIGNAL", "INFO", "", "Sinyal motoru tarama tamamlandı • 6 sinyal"],
      ["RISK", "INFO", "", "Kelly fraksiyonu hesaplandı: %3.8 (maruziyet limiti)"],
      ["UI", "INFO", "UI-1001", "UI-CLICK screen=HomeScreen button=EXECUTE_PAPER_TRADE_HOME"],
      ["UI", "INFO", "UI-1001", "UI-CLICK screen=ChartScreen button=CHANGE_TIMEFRAME timeframe=15m"],
      ["NETWORK", "WARN", "NETWORK-3001", "Binance API gecikme 842ms (eşik 500ms)"],
      ["WEBSOCKET", "WARN", "WS-3101", "WS bağlantısı koptu • otomatik yeniden deneme 2/5"],
      ["DATA", "WARN", "DATA-2001", "AVAXUSDT 4h bölümünde 3 eksik mum • Sync Missing önerildi"],
      ["DOWNLOAD", "INFO", "", "Senkronizasyon: 3 eksik bölüm indirildi"],
      ["SYNC", "INFO", "", "Veri senkronizasyonu tamamlandı • 0 hata"],
      ["PERFORMANCE", "INFO", "", "Çıkarım süresi 24ms • bellek 148MB"],
      ["DATABASE", "INFO", "DB-4001", "SQLite metadata.db güncellendi (6 sembol, 18 bölüm)"],
      ["API", "INFO", "API-9001", "GET /api/signals/active 200 • 6 sinyal"],
      ["SECURITY", "INFO", "", "API anahtarı doğrulandı • imza geçerli"],
      ["MODEL", "WARN", "MODEL-7001", "v1.3.8 reddedildi: sharpe 1.21 < şampiyon 1.92"],
      ["ERROR", "ERROR", "NETWORK-3001", "REST çağrısı başarısız • fallback demo verisine geçildi"],
      ["CRITICAL", "ERROR", "WS-3101", "Canlı veri akışı durdu (offline mod) • telemetri durduruldu"],
      ["SYSTEM", "INFO", "", "Oturum durumu: PAPER-TRADING aktif • gerçek emir kapalı"],
      ["BACKTEST", "INFO", "", "Fonlama kesintisi uygulandı: -42.8 USDT (30 gün)"],
      ["VALIDATION", "INFO", "", "Örneklem dışı test: doğruluk %67.4 • AUC 0.73"],
      ["SIGNAL", "INFO", "", "ETHUSDT SHORT sinyali kapatıldı • TP1 isabetli"]
    ];
    const logs = logDefs.map((d, i) => ({
      timestamp: new Date(Date.now() - (logDefs.length - i) * 137000).toISOString(),
      category: d[0], severity: d[1], code: d[2], message: d[3]
    }));

    return {
      prices, changes, funding, oi, vol,
      signals, dataStatus, models, logs,
      positions: [{
        id: "POS-001", symbol: "BTCUSDT", side: "LONG", leverage: 10,
        unrealized_pnl: 42.5, pnl_pct: 2.1, entry_price: 104250,
        liquidation_price: 94830, tp: 105180, sl: 103820
      }]
    };
  }
}

window.apiClient = new FuturesApiClient();
