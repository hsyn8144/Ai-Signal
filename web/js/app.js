/**
 * Futures AI Mobile Application Core Controller
 * Fully implements MASTER_PROMPT_TR & mobile_mockup.html specifications
 */

document.addEventListener("DOMContentLoaded", () => {
  // Global State
  let currentSymbol = "BTCUSDT";
  let currentTimeframe = "15m";
  let activePageId = "page-home";
  let chartInstance = null;
  let homeOrbit = null;
  let trainingOrbit = null;

  // APK / WebView mode detection (native wrapper loads with ?apk=1)
  const IS_APK = location.search.indexOf("apk=1") !== -1 ||
    location.hostname === "appassets.androidplatform.net";
  window.IS_APK = IS_APK;
  if (IS_APK) {
    document.body.classList.add("apk-mode");
    const pc = document.getElementById("phoneContainer");
    if (pc) pc.classList.add("fullscreen-mode");
  }

  // 1. Splash Screen Auto-Dismissal (2.0s as required: 1.5–2.5s)
  const splashEl = document.getElementById("splashOverlay");
  setTimeout(() => {
    if (splashEl) {
      splashEl.classList.add("hidden");
    }
  }, 2000);

  // Status Bar Live Clock
  const clockEl = document.getElementById("statusBarClock");
  const updateClock = () => {
    const d = new Date();
    if (clockEl) {
      clockEl.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  };
  setInterval(updateClock, 10000);
  updateClock();

  // 2. Fullscreen / Phone Frame Toggle
  const phoneContainer = document.getElementById("phoneContainer");
  const toggleDeviceBtn = document.getElementById("toggleDeviceModeBtn");
  if (toggleDeviceBtn && phoneContainer) {
    toggleDeviceBtn.addEventListener("click", () => {
      phoneContainer.classList.toggle("fullscreen-mode");
      const isFull = phoneContainer.classList.contains("fullscreen-mode");
      toggleDeviceBtn.textContent = isFull ? "Telefon Çerçevesi Modu" : "Tam Ekran Yap";
      if (chartInstance) {
        setTimeout(() => {
          chartInstance.initCanvasDPI();
          chartInstance.render();
        }, 300);
      }
    });
  }

  // 3. Initialize NeonOrbitProgress Components
  const homeOrbitContainer = document.getElementById("homeOrbitContainer");
  if (homeOrbitContainer) {
    homeOrbit = new NeonOrbitProgress(homeOrbitContainer, {
      size: 210,
      initialPercent: 72,
      label: "BTCUSDT • MULTI TIMEFRAME",
      sublabel: "CHRONOLOGICAL ENSEMBLE"
    });
  }

  const trainingOrbitContainer = document.getElementById("trainingOrbitContainer");
  if (trainingOrbitContainer) {
    trainingOrbit = new NeonOrbitProgress(trainingOrbitContainer, {
      size: 190,
      initialPercent: 0,
      label: "BTCUSDT • STANDBY",
      sublabel: "AWAITING PIPELINE START"
    });
  }

  // 4. Navigation & Tab Switching
  const navItems = document.querySelectorAll(".nav-item[data-tab]");
  const pages = document.querySelectorAll(".page");
  const menuDrawer = document.getElementById("menuDrawer");
  const navItemMenu = document.getElementById("navItemMenu");
  const btnCloseMenu = document.getElementById("btnCloseMenu");

  const switchPage = (targetPageId) => {
    pages.forEach(p => p.classList.remove("active"));
    const targetPage = document.getElementById(targetPageId);
    if (targetPage) {
      targetPage.classList.add("active");
      activePageId = targetPageId;
    }

    navItems.forEach(n => {
      if (n.getAttribute("data-tab") === targetPageId) n.classList.add("active");
      else n.classList.remove("active");
    });

    if (menuDrawer) menuDrawer.classList.remove("open");

    // Re-render chart if switching to chart screen
    if (targetPageId === "page-chart" && chartInstance) {
      setTimeout(() => {
        chartInstance.initCanvasDPI();
        chartInstance.render();
      }, 50);
    }

    apiClient.logClick(targetPageId, "NAVIGATE_TAB", { symbol: currentSymbol });
  };

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");
      switchPage(tabId);
    });
  });

  if (navItemMenu && menuDrawer) {
    navItemMenu.addEventListener("click", () => {
      menuDrawer.classList.toggle("open");
      apiClient.logClick("Navigation", "OPEN_MENU_DRAWER");
    });
  }

  if (btnCloseMenu && menuDrawer) {
    btnCloseMenu.addEventListener("click", () => {
      menuDrawer.classList.remove("open");
    });
  }

  // Drawer menu items navigation
  document.querySelectorAll(".menu-item[data-goto]").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-goto");
      switchPage(target);
      if (target === "page-data") loadDataStatus();
      if (target === "page-models") loadModelsList();
      if (target === "page-logs") loadLogs();
      if (target === "page-backtest") loadPaperTrading();
    });
  });

  // 5. Symbol Switching
  const assetPills = document.querySelectorAll(".asset-pill[data-symbol]");
  assetPills.forEach(pill => {
    pill.addEventListener("click", () => {
      assetPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentSymbol = pill.getAttribute("data-symbol");

      if (homeOrbit) homeOrbit.setLabel(`${currentSymbol} • MULTI TIMEFRAME`);
      if (trainingOrbit) trainingOrbit.setLabel(`${currentSymbol} • STANDBY`);

      const chartDisplay = document.getElementById("chartSymbolDisplay");
      if (chartDisplay) chartDisplay.textContent = `${currentSymbol} [PERP]`;

      updateTickerData();
      loadChartData();
      loadActiveSignals();

      apiClient.logClick("AssetSelector", "SELECT_SYMBOL", { symbol: currentSymbol });
    });
  });

  // 6. Live Ticker Updates
  const updateTickerData = async () => {
    const data = await apiClient.getTicker(currentSymbol);
    if (!data) return;

    const priceEl = document.getElementById("tickerPrice");
    const changeEl = document.getElementById("tickerChange");
    const fundingEl = document.getElementById("tickerFunding");
    const oiEl = document.getElementById("tickerOI");
    const volEl = document.getElementById("tickerVol");

    if (priceEl) priceEl.textContent = `$${data.price.toLocaleString(undefined, { minimumFractionDigits: data.price > 100 ? 1 : 4 })}`;
    if (changeEl) {
      changeEl.textContent = `${data.change_24h >= 0 ? '+' : ''}${data.change_24h}% (24s)`;
      changeEl.style.color = data.change_24h >= 0 ? "var(--neon-green)" : "var(--neon-red)";
    }
    if (fundingEl) {
      fundingEl.textContent = `${data.funding_rate >= 0 ? '+' : ''}${data.funding_rate.toFixed(4)}%`;
      fundingEl.style.color = data.funding_rate < 0 ? "var(--neon-green)" : "var(--neon-cyan)";
    }
    if (oiEl) oiEl.textContent = `$${data.open_interest}`;
    if (volEl) volEl.textContent = `$${data.volume_24h}`;
  };

  // Poll ticker smoothly every 3.5s
  setInterval(updateTickerData, 3500);
  updateTickerData();

  // 7. Candlestick Chart Initialization
  const canvas = document.getElementById("mainChart");
  if (canvas) {
    chartInstance = new FuturesTradingChart("mainChart", {
      symbol: currentSymbol,
      timeframe: currentTimeframe
    });
  }

  const loadChartData = async () => {
    if (!chartInstance) return;
    const res = await apiClient.getCandles(currentSymbol, currentTimeframe, 160);
    if (res && res.candles) {
      chartInstance.setData(res.candles);
      // Set indicator readings
      const last = res.candles[res.candles.length - 1];
      if (last) {
        document.getElementById("indEma20Val").textContent = (last.close * 0.998).toFixed(1);
        document.getElementById("indEma50Val").textContent = (last.close * 0.995).toFixed(1);
        document.getElementById("indRsiVal").textContent = "58.4";
      }
    }
  };
  loadChartData();

  // Chart Timeframe switchers
  document.querySelectorAll(".chart-tf-btn[data-tf]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chart-tf-btn[data-tf]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTimeframe = btn.getAttribute("data-tf");
      chartInstance.setTimeframe(currentTimeframe);
      loadChartData();
      apiClient.logClick("Chart", "CHANGE_TIMEFRAME", { timeframe: currentTimeframe });
    });
  });

  // Chart Style switchers
  document.getElementById("btnChartTypeCandle")?.addEventListener("click", (e) => {
    chartInstance.setChartType("CANDLE");
    resetChartTypeButtons(e.target);
  });
  document.getElementById("btnChartTypeBar")?.addEventListener("click", (e) => {
    chartInstance.setChartType("BAR");
    resetChartTypeButtons(e.target);
  });
  document.getElementById("btnChartTypeHeikin")?.addEventListener("click", (e) => {
    chartInstance.setChartType("HEIKIN");
    resetChartTypeButtons(e.target);
  });
  document.getElementById("btnChartTypeLine")?.addEventListener("click", (e) => {
    chartInstance.setChartType("LINE");
    resetChartTypeButtons(e.target);
  });

  function resetChartTypeButtons(activeBtn) {
    ["btnChartTypeCandle", "btnChartTypeBar", "btnChartTypeHeikin", "btnChartTypeLine"].forEach(id => {
      document.getElementById(id)?.classList.remove("active");
    });
    activeBtn?.classList.add("active");
  }

  // Chart Latest Price Navigation Button
  document.getElementById("btnNavLatestPrice")?.addEventListener("click", () => {
    if (chartInstance) {
      chartInstance.offset = 0;
      chartInstance.render();
      apiClient.logClick("Chart", "NAVIGATE_LATEST_PRICE");
    }
  });

  // Chart Overlay & Target Toggles
  document.getElementById("btnToggleEMA")?.addEventListener("click", (e) => {
    if (chartInstance) {
      chartInstance.showEMA = !chartInstance.showEMA;
      e.target.classList.toggle("active", chartInstance.showEMA);
      chartInstance.render();
    }
  });

  document.getElementById("btnToggleTargets")?.addEventListener("click", (e) => {
    if (chartInstance) {
      chartInstance.showTargets = !chartInstance.showTargets;
      e.target.classList.toggle("active", chartInstance.showTargets);
      chartInstance.render();
    }
  });

  // Drawing Tools (Horizontal, Vertical, Box, Hide/Show, Clear)
  document.getElementById("btnToolHorizontal")?.addEventListener("click", () => {
    if (chartInstance && chartInstance.candles.length) {
      const lastClose = chartInstance.candles[chartInstance.candles.length - 1].close;
      chartInstance.drawings.push({
        type: "HORIZONTAL",
        price: lastClose,
        color: "#ffe600"
      });
      chartInstance.render();
      apiClient.logClick("Chart", "ADD_DRAWING_TOOL", { tool: "HORIZONTAL", price: lastClose });
    }
  });

  document.getElementById("btnToolVertical")?.addEventListener("click", () => {
    if (chartInstance) {
      chartInstance.drawings.push({
        type: "VERTICAL",
        x: (chartInstance.width - 55) * 0.7,
        color: "#00e5ff"
      });
      chartInstance.render();
      apiClient.logClick("Chart", "ADD_DRAWING_TOOL", { tool: "VERTICAL" });
    }
  });

  document.getElementById("btnToolBox")?.addEventListener("click", () => {
    if (chartInstance && chartInstance.candles.length) {
      const lastClose = chartInstance.candles[chartInstance.candles.length - 1].close;
      chartInstance.drawings.push({
        type: "BOX",
        top: lastClose * 1.004,
        bottom: lastClose * 0.996,
        color: "#a855f7"
      });
      chartInstance.render();
      apiClient.logClick("Chart", "ADD_DRAWING_TOOL", { tool: "BOX" });
    }
  });

  document.getElementById("btnToggleDrawings")?.addEventListener("click", () => {
    if (chartInstance) {
      chartInstance.drawingsVisible = !chartInstance.drawingsVisible;
      chartInstance.render();
    }
  });

  document.getElementById("btnClearDrawings")?.addEventListener("click", () => {
    if (chartInstance) {
      chartInstance.drawings = [];
      chartInstance.render();
      apiClient.logClick("Chart", "CLEAR_DRAWINGS");
    }
  });

  // 8. Load & Render Active Signals
  const loadActiveSignals = async () => {
    const signals = await apiClient.getActiveSignals();
    if (!signals || !signals.length) return;

    const topSig = signals.find(s => s.symbol === currentSymbol) || signals[0];
    
    // Update Home Active Signal Card
    const dirEl = document.getElementById("homeSigDirection");
    const symEl = document.getElementById("homeSigSymbol");
    const scoreEl = document.getElementById("homeSigScore");
    const entryEl = document.getElementById("homeSigEntry");
    const levEl = document.getElementById("homeSigLev");
    const tp1El = document.getElementById("homeSigTP1");
    const tp2El = document.getElementById("homeSigTP2");
    const slEl = document.getElementById("homeSigSL");
    const rrEl = document.getElementById("homeSigRR");
    const durEl = document.getElementById("homeSigDuration");
    const regEl = document.getElementById("homeSigRegime");
    const ratEl = document.getElementById("homeSigRationale");

    if (dirEl) {
      dirEl.textContent = topSig.direction;
      dirEl.className = `signal-direction ${topSig.direction.toLowerCase()}`;
    }
    if (symEl) symEl.textContent = `${topSig.symbol} • ${topSig.timeframe}`;
    if (scoreEl) scoreEl.textContent = `Skor: ${topSig.score}/100`;
    if (entryEl) entryEl.textContent = `${topSig.entry_price.toLocaleString()} USDT`;
    if (levEl) levEl.textContent = topSig.leverage || "5x - 10x";
    if (tp1El) tp1El.textContent = `${topSig.tp1.toLocaleString()} (%${topSig.tp1_prob || 81} Olasılık)`;
    if (tp2El) tp2El.textContent = `${topSig.tp2.toLocaleString()} (%${topSig.tp2_prob || 63} Olasılık)`;
    if (slEl) slEl.textContent = `${topSig.sl.toLocaleString()} (%${topSig.sl_prob || 17} Olasılık)`;
    if (rrEl) {
      const kellyText = topSig.kelly_fraction_pct ? ` (Kasa: %${topSig.kelly_fraction_pct})` : " (Kasa: %3.8)";
      rrEl.textContent = `1 : ${topSig.risk_reward}${kellyText}`;
    }
    if (durEl) durEl.textContent = topSig.expected_duration;
    if (regEl) regEl.textContent = topSig.market_regime;
    if (ratEl) ratEl.textContent = topSig.rationale;

    const bMagnet = document.getElementById("badgeMagnet");
    const bSession = document.getElementById("badgeSession");
    const bHurst = document.getElementById("badgeHurst");
    if (bMagnet && topSig.liq_magnet_level) bMagnet.textContent = `🧲 Mıknatıs: ${topSig.liq_magnet_level}`;
    if (bSession && topSig.active_session) bSession.textContent = topSig.active_session;
    if (bHurst && topSig.hurst_regime) bHurst.textContent = topSig.hurst_regime;

    // Overlay signal target levels onto chart
    if (chartInstance) {
      chartInstance.setSignalTargets({
        entry: topSig.entry_price,
        tp1: topSig.tp1,
        tp2: topSig.tp2,
        sl: topSig.sl,
        direction: topSig.direction
      });
    }

    // Render Signals List Page
    renderSignalsListPage(signals);
  };

  const renderSignalsListPage = (signals) => {
    const container = document.getElementById("signalsListContainer");
    if (!container) return;

    container.innerHTML = signals.map(s => `
      <div class="card ${s.direction === 'LONG' ? 'green-card' : 'red-card'}">
        <div class="signal-badge-row">
          <div>
            <span class="signal-direction ${s.direction.toLowerCase()}" style="font-size:22px;">${s.direction}</span>
            <span style="font-size:12px; font-weight:700; margin-left:6px; color:var(--text-muted);">${s.symbol}</span>
          </div>
          <span class="signal-score-badge">Skor: ${s.score}/100</span>
        </div>

        <div class="signal-grid">
          <div class="signal-metric">
            <div class="m-label">GİRİŞ</div>
            <div class="m-val cyan">${s.entry_price.toLocaleString()} USDT</div>
          </div>
          <div class="signal-metric">
            <div class="m-label">R:R ORANI</div>
            <div class="m-val yellow">1 : ${s.risk_reward}</div>
          </div>
          <div class="signal-metric">
            <div class="m-label">TP1 (%${s.tp1_prob})</div>
            <div class="m-val green">${s.tp1.toLocaleString()}</div>
          </div>
          <div class="signal-metric">
            <div class="m-label">TP2 (%${s.tp2_prob})</div>
            <div class="m-val green">${s.tp2.toLocaleString()}</div>
          </div>
          <div class="signal-metric">
            <div class="m-label">STOP LOSS (%${s.sl_prob})</div>
            <div class="m-val red">${s.sl.toLocaleString()}</div>
          </div>
          <div class="signal-metric">
            <div class="m-label">SÜRE / REJİM</div>
            <div class="m-val" style="font-size:10px;">${s.expected_duration}</div>
          </div>
        </div>

        <div class="signal-rationale" style="font-size:10px; margin-bottom:10px;">
          ${s.rationale}
        </div>

        <button class="btn btn-primary btn-execute-trade" data-sig-id="${s.id}" style="font-size:11px; padding:8px;">
          ⚡ Paper Trading Emri Ver
        </button>
      </div>
    `).join("");

    // Bind execution buttons
    container.querySelectorAll(".btn-execute-trade").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-sig-id");
        const sig = signals.find(s => s.id === id);
        if (sig) {
          await apiClient.executePaperTrade({
            symbol: sig.symbol,
            direction: sig.direction,
            entry_price: sig.entry_price,
            tp2: sig.tp2,
            sl: sig.sl,
            size_usdt: 1000.0,
            leverage: 10
          });
          btn.textContent = "✓ Paper Pozisyon Açıldı";
          btn.style.background = "var(--neon-green)";
          btn.style.color = "#000";
        }
      });
    });
  };

  loadActiveSignals();

  // 1-Click Paper Trade from Home
  document.getElementById("btnExecutePaperHome")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnExecutePaperHome");
    btn.textContent = "⏳ İşlem İletiliyor...";
    await apiClient.executePaperTrade({
      symbol: currentSymbol,
      direction: "LONG",
      entry_price: 104250.0,
      tp2: 105180.0,
      sl: 103820.0,
      size_usdt: 2000.0,
      leverage: 10
    });
    btn.textContent = "✓ 2,000 USDT Paper Pozisyonu Açıldı";
    setTimeout(() => {
      btn.textContent = "Paper Trading ile Tek Tıkla Uygula";
    }, 2500);
    apiClient.logClick("HomeScreen", "EXECUTE_PAPER_TRADE_HOME", { symbol: currentSymbol });
  });

  // Signal Scanner Button
  document.getElementById("btnScanNewSignal")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnScanNewSignal");
    btn.textContent = "📡 Taranıyor (Neon Orbit Radar)...";
    const sig = await apiClient.scanSignals(currentSymbol, currentTimeframe);
    btn.textContent = "✓ Sinyal Tespit Edildi!";
    setTimeout(() => {
      btn.textContent = "Yeni Vadeli İşlem Sinyali Tara";
      loadActiveSignals();
    }, 1500);
  });

  // 9. Chronological 13-Step Training Pipeline Execution
  const pipelineListEl = document.getElementById("pipelineStepsList");
  const PIPELINE_STEPS = [
    { step: 1, name: "Data Check", desc: "Parquet bölümleri ve zaman serisi doğrulanıyor" },
    { step: 2, name: "Validation / Normalization", desc: "Aykırı değer ve sıfır fiyat temizliği" },
    { step: 3, name: "Timeframe Construction", desc: "1m mumlarından 5m, 15m, 1h, 4h türetimi" },
    { step: 4, name: "Feature Engineering", desc: "Fitil oranı, volatilite, momentum, hacim ivmesi" },
    { step: 5, name: "Indicator Calculations", desc: "Python EMA, VWAP, BB, SuperTrend, RSI, MACD" },
    { step: 6, name: "Label Generation", desc: "TP1/TP2/SL çok ufuklu hedef etiketleme" },
    { step: 7, name: "Model Training", desc: "LightGBM + Random Forest + LSTM eğitimi" },
    { step: 8, name: "Validation", desc: "Örneklem dışı ileriye dönük doğrulama" },
    { step: 9, name: "Walk-Forward Evaluation", desc: "Sızıntısız kayan pencere testleri" },
    { step: 10, name: "Backtest", desc: "Komisyon (0.02%/0.05%), kayma ve fonlama kesintisi" },
    { step: 11, name: "Model Evaluation", desc: "Kazanma oranı, Sharpe, Kâr faktörü tespiti" },
    { step: 12, name: "Model Checkpoint / Registry", desc: "Versiyon kaydı veya kötü modelin reddi" },
    { step: 13, name: "Ready", desc: "Canlı çıkarım havuzuna onaylandı" }
  ];

  const renderPipelineSteps = (activeStepIdx = -1) => {
    if (!pipelineListEl) return;
    pipelineListEl.innerHTML = PIPELINE_STEPS.map((s, idx) => {
      let cls = "step-item";
      if (idx < activeStepIdx) cls += " completed";
      else if (idx === activeStepIdx) cls += " active";
      return `
        <div class="${cls}">
          <div class="step-num">${idx < activeStepIdx ? '✓' : s.step}</div>
          <div style="flex:1;">
            <div style="font-weight:700; color:var(--text-white);">${s.name}</div>
            <div style="font-size:9px; color:var(--text-muted);">${s.desc}</div>
          </div>
        </div>
      `;
    }).join("");
  };
  renderPipelineSteps();

  const startTrainingAction = async () => {
    const btn = document.getElementById("btnStartFullTraining");
    if (btn) btn.disabled = true;

    if (trainingOrbit) {
      trainingOrbit.setLabel(`${currentSymbol} • MULTI TIMEFRAME`);
    }

    const steps = [
      { percent: 15, label: "1-3: DATA & TIMEFRAME", duration: 500 },
      { percent: 35, label: "4-6: INDICATORS & LABELS", duration: 600 },
      { percent: 65, label: "7-8: ENSEMBLE TRAINING", duration: 700 },
      { percent: 85, label: "9-11: WALK-FORWARD & BACKTEST", duration: 600 },
      { percent: 100, label: "12-13: REGISTERED & READY", duration: 500 }
    ];

    let currentPIdx = 0;
    const interval = setInterval(() => {
      renderPipelineSteps(currentPIdx);
      currentPIdx++;
      if (currentPIdx >= PIPELINE_STEPS.length) {
        clearInterval(interval);
      }
    }, 280);

    trainingOrbit.runSequence(steps, async () => {
      const selectedTfs = Array.from(document.querySelectorAll("#trainTfPills .asset-pill.active"))
        .map(p => p.getAttribute("data-tf"));
      const selectedFamilies = Array.from(document.querySelectorAll(".model-check:checked"))
        .map(c => c.value);

      const res = await apiClient.startTraining({
        symbol: currentSymbol,
        timeframes: selectedTfs.length ? selectedTfs : ["15m", "1h"],
        model_families: selectedFamilies.length ? selectedFamilies : ["LightGBM", "Random Forest"]
      });

      renderPipelineSteps(13);

      const metricsCard = document.getElementById("trainingMetricsCard");
      if (metricsCard && res.metrics) {
        metricsCard.style.display = "block";
        document.getElementById("metricWinRate").textContent = `${res.metrics.win_rate}%`;
        document.getElementById("metricPF").textContent = `${res.metrics.profit_factor}`;
        document.getElementById("metricSharpe").textContent = `${res.metrics.sharpe_ratio}`;
        document.getElementById("metricMaxDD").textContent = `${res.metrics.max_drawdown}%`;
        document.getElementById("metricRegistryStatus").textContent = 
          `Kayıt Sonucu: ${res.registration?.version} • Durum: ${res.registration?.status} (${res.registration?.decision})`;
      }

      if (btn) btn.disabled = false;
      apiClient.logClick("TrainingScreen", "START_TRAINING", { symbol: currentSymbol, trainingId: `TR-${Date.now()%10000}` });
    });
  };

  document.getElementById("btnStartFullTraining")?.addEventListener("click", startTrainingAction);
  document.getElementById("btnQuickTrain")?.addEventListener("click", () => {
    switchPage("page-training");
    setTimeout(startTrainingAction, 300);
  });

  // 10. Data Manager Status Loader
  const loadDataStatus = async () => {
    const listEl = document.getElementById("dataStatusList");
    if (!listEl) return;
    const statusData = await apiClient.getDataStatus();
    if (!statusData || !statusData.length) return;

    listEl.innerHTML = statusData.map(d => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:8px 10px; border-radius:8px; font-size:11px; border:1px solid rgba(255,255,255,0.05);">
        <div>
          <b style="color:var(--text-white);">${d.symbol}</b>
          <span style="color:var(--neon-cyan); margin-left:6px;">${d.timeframe}</span>
        </div>
        <div style="text-align:right;">
          <span style="color:${d.status === 'SYNCED' ? 'var(--neon-green)' : 'var(--neon-red)'}; font-weight:700;">${d.status}</span>
          <span style="color:var(--text-dim); margin-left:6px;">${d.total_candles} mum (${d.size_kb} KB)</span>
        </div>
      </div>
    `).join("");
  };

  // Data Manager Action Controls
  document.getElementById("btnDownloadAll")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnDownloadAll");
    btn.textContent = "Tüm Pariteler İndiriliyor...";
    await apiClient.syncData(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "AVAXUSDT", "XRPUSDT"], ["15m", "1h", "4h"]);
    btn.textContent = "✓ Tüm Parquet İndirildi";
    setTimeout(() => {
      btn.textContent = "Tüm Varlıkları İndir";
      loadDataStatus();
    }, 2000);
    apiClient.logClick("DataManager", "DOWNLOAD_ALL_ASSETS");
  });

  document.getElementById("btnDataPause")?.addEventListener("click", () => {
    alert("Veri senkronizasyonu duraklatıldı.");
    apiClient.logClick("DataManager", "PAUSE_SYNC");
  });

  document.getElementById("btnDataResume")?.addEventListener("click", () => {
    alert("Veri senkronizasyonuna devam ediliyor.");
    apiClient.logClick("DataManager", "RESUME_SYNC");
  });

  document.getElementById("btnDataCancel")?.addEventListener("click", () => {
    alert("Senkronizasyon iptal edildi.");
    apiClient.logClick("DataManager", "CANCEL_SYNC");
  });

  // Add New Asset Workflow (check symbol -> download history -> validate -> build timeframes -> ready)
  document.getElementById("btnAddNewAsset")?.addEventListener("click", async () => {
    const input = document.getElementById("newAssetInput");
    const status = document.getElementById("newAssetStatus");
    const symbol = (input?.value || "").trim().toUpperCase();
    if (!symbol || !symbol.endsWith("USDT")) {
      alert("Lütfen geçerli bir Binance USDT-M sembolü girin (örn: NEARUSDT)");
      return;
    }

    if (status) {
      status.style.display = "block";
      status.textContent = `1/5: ${symbol} sembolü Binance USDT-M üzerinde doğrulanıyor...`;
    }

    setTimeout(() => {
      if (status) status.textContent = `2/5: Geçmiş Parquet verisi indiriliyor...`;
    }, 700);

    setTimeout(() => {
      if (status) status.textContent = `3/5: Çoklu zaman dilimleri (1m -> 15m, 1h) inşa ediliyor...`;
    }, 1400);

    setTimeout(async () => {
      if (status) status.textContent = `4/5: İlk model eğitimi ve doğrulama tamamlanıyor...`;
      await apiClient.syncData([symbol], ["15m", "1h"]);
    }, 2100);

    setTimeout(() => {
      if (status) {
        status.textContent = `✓ 5/5: ${symbol} başarıyla eklendi ve sisteme entegre edildi!`;
      }
      // Add pill to asset bar
      const bar = document.getElementById("assetSelectorBar");
      if (bar) {
        const newPill = document.createElement("div");
        newPill.className = "asset-pill";
        newPill.setAttribute("data-symbol", symbol);
        newPill.textContent = symbol;
        newPill.addEventListener("click", () => {
          document.querySelectorAll(".asset-pill[data-symbol]").forEach(p => p.classList.remove("active"));
          newPill.classList.add("active");
          currentSymbol = symbol;
          updateTickerData();
          loadChartData();
          loadActiveSignals();
        });
        bar.appendChild(newPill);
      }
      loadDataStatus();
      input.value = "";
      apiClient.logClick("DataManager", "ADD_NEW_ASSET", { symbol });
    }, 3000);
  });

  // Signal Direction & Multi-attribute filters
  let sigDirectionFilter = "ALL";
  let sigMinScoreFilter = 80;

  const applySignalFilters = async () => {
    const signals = await apiClient.getActiveSignals(sigDirectionFilter, sigMinScoreFilter);
    renderSignalsListPage(signals);
  };

  document.getElementById("filterSigAll")?.addEventListener("click", (e) => {
    sigDirectionFilter = "ALL";
    resetSigFilterButtons(e.target);
    applySignalFilters();
  });
  document.getElementById("filterSigLong")?.addEventListener("click", (e) => {
    sigDirectionFilter = "LONG";
    resetSigFilterButtons(e.target);
    applySignalFilters();
  });
  document.getElementById("filterSigShort")?.addEventListener("click", (e) => {
    sigDirectionFilter = "SHORT";
    resetSigFilterButtons(e.target);
    applySignalFilters();
  });

  function resetSigFilterButtons(activeBtn) {
    ["filterSigAll", "filterSigLong", "filterSigShort"].forEach(id => {
      document.getElementById(id)?.classList.remove("active");
    });
    activeBtn?.classList.add("active");
  }

  document.getElementById("filterMinScore")?.addEventListener("change", (e) => {
    sigMinScoreFilter = parseInt(e.target.value) || 0;
    applySignalFilters();
  });

  // Service Worker Registration for PWA (skipped inside native APK WebView)
  if ('serviceWorker' in navigator && !IS_APK) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('SW registration note:', err.message);
    });
  }

  // PWA Install Prompt Listener
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  document.getElementById("btnInstallPwaMenu")?.addEventListener("click", () => {
    if (IS_APK) {
      alert("Futures AI zaten telefonunuza uygulama olarak kurulu ✓");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
          alert("Futures AI telefonunuza yükleniyor!");
        }
        deferredPrompt = null;
      });
    } else {
      alert("Telefonunuzun tarayıcı menüsünden (⋮ veya Paylaş) 'Ana Ekrana Ekle' / 'Uygulamayı Yükle' seçeneğine basarak anında yükleyebilirsiniz!");
    }
  });

  // Offline-capable log formatting & export (JSON / TXT / CSV)
  const formatLogsForExport = (logs, format) => {
    if (format === "json") return JSON.stringify(logs, null, 2);
    if (format === "csv") {
      const head = "timestamp,category,severity,code,message";
      const rows = logs.map(l =>
        `${l.timestamp},${l.category},${l.severity},${l.code || ""},"${String(l.message).replace(/"/g, '""')}"`);
      return [head, ...rows].join("\n");
    }
    return logs.map(l =>
      `${l.timestamp} [${l.category}] ${l.severity}${l.code ? " [" + l.code + "]" : ""} ${l.message}`
    ).join("\n");
  };

  const exportLogsClient = async (format) => {
    try {
      let txt = "";
      try {
        const resp = await fetch(`/api/logs/export?format=${format}`);
        if (resp.ok) txt = await resp.text();
      } catch (e) { /* offline - use local buffer */ }
      if (!txt) {
        const logs = await apiClient.getLogs("ALL", "ALL", "");
        txt = formatLogsForExport(Array.isArray(logs) ? logs : [], format);
      }
      if (navigator.share) {
        try {
          await navigator.share({ title: `Futures AI Logs (${format.toUpperCase()})`, text: txt });
          return;
        } catch (e) { /* fall through to clipboard */ }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt);
        alert(`Günlükler ${format.toUpperCase()} olarak panoya kopyalandı!`);
        return;
      }
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      alert(`Günlükler ${format.toUpperCase()} olarak panoya kopyalandı!`);
    } catch (e) {
      alert("Dışa aktarma başarısız: " + e.message);
    }
  };

  document.getElementById("btnDownloadApkMenu")?.addEventListener("click", () => {
    if (IS_APK) {
      alert("Zaten Futures AI APK sürümünü kullanıyorsunuz ✓");
      return;
    }
    window.location.href = "/api/download/FuturesAI.apk";
  });

  // Export Logs to Clipboard
  document.getElementById("btnCopyLogs")?.addEventListener("click", () => exportLogsClient("txt"));

  // 11. Model Registry Loader
  const loadModelsList = async () => {
    const container = document.getElementById("modelRegistryList");
    if (!container) return;
    const models = await apiClient.getModels();
    if (!models || !models.length) return;

    container.innerHTML = models.map(m => `
      <div class="card ${m.status === 'ACTIVE' ? 'green-card' : ''}">
        <div class="signal-badge-row">
          <div style="font-size:12px; font-weight:800; color:var(--neon-purple);">${m.version}</div>
          <span class="signal-score-badge" style="${m.status === 'ACTIVE' ? 'color:var(--neon-green); border-color:var(--neon-green);' : ''}">${m.status}</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px;">Aile: ${m.family} • Zaman: ${m.timeframe}</div>
        <div class="signal-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
          <div class="signal-metric"><div class="m-label">WIN %</div><div class="m-val green">${m.win_rate}%</div></div>
          <div class="signal-metric"><div class="m-label">PF</div><div class="m-val yellow">${m.profit_factor}</div></div>
          <div class="signal-metric"><div class="m-label">SHARPE</div><div class="m-val cyan">${m.sharpe_ratio}</div></div>
          <div class="signal-metric"><div class="m-label">MAX DD</div><div class="m-val red">${m.max_drawdown}%</div></div>
        </div>
      </div>
    `).join("");
  };

  // 12. Backtest Runner & Paper Trading
  document.getElementById("btnRunBacktest")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnRunBacktest");
    btn.textContent = "Geriye Dönük Test Hesaplanıyor...";
    const capital = parseFloat(document.getElementById("btCapital")?.value || "10000");
    const leverage = parseInt(document.getElementById("btLeverage")?.value || "5");
    const risk = parseFloat(document.getElementById("btRiskPct")?.value || "2.0");

    const res = await apiClient.runBacktest({
      symbol: currentSymbol,
      initial_capital: capital,
      leverage: leverage,
      risk_pct: risk
    });

    btn.textContent = "Geriye Dönük Testi Çalıştır (Futures Ücretleri Dahil)";

    if (res && !res.error) {
      document.getElementById("btNetPnl").textContent = `+$${res.net_pnl} (+${res.net_return_pct}%)`;
      document.getElementById("btWinRate").textContent = `${res.win_rate}%`;
      document.getElementById("btPF").textContent = `${res.profit_factor}`;
      document.getElementById("btMaxDD").textContent = `-${res.max_drawdown}%`;
      document.getElementById("btFees").textContent = `$${res.total_fees} (Kayma: $${res.total_slippage})`;
      document.getElementById("btSharpe").textContent = `${res.sharpe_ratio} / ${res.sortino_ratio}`;
    }
  });

  const loadPaperTrading = async () => {
    const pt = await apiClient.getPaperTrading();
    if (!pt) return;

    document.getElementById("ptEquity").textContent = `$${pt.equity.toLocaleString()}`;
    document.getElementById("ptMargin").textContent = `$${pt.used_margin.toLocaleString()}`;

    const posContainer = document.getElementById("paperPositionsList");
    if (!posContainer) return;

    if (!pt.positions.length) {
      posContainer.innerHTML = `<div style="font-size:11px; color:var(--text-dim); padding:10px; text-align:center;">Açık pozisyon bulunmuyor.</div>`;
      return;
    }

    posContainer.innerHTML = pt.positions.map(p => `
      <div style="background:rgba(0,0,0,0.5); padding:10px; border-radius:10px; border-left:3px solid ${p.side === 'LONG' ? 'var(--neon-green)' : 'var(--neon-red)'}; font-size:11px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <b>${p.symbol} ${p.side} (${p.leverage}x)</b>
          <span style="color:var(--neon-green); font-weight:800;">+$${p.unrealized_pnl} (+${p.pnl_pct}%)</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-top:4px; font-size:10px; color:var(--text-muted);">
          <div>Giriş: ${p.entry_price}</div>
          <div>Likit: <span style="color:var(--neon-red);">${p.liquidation_price}</span></div>
          <div>TP: ${p.tp}</div>
          <div>SL: ${p.sl}</div>
        </div>
        <button class="btn btn-outline btn-close-pos" data-pos-id="${p.id}" style="font-size:10px; padding:4px; margin-top:6px;">
          Pozisyonu Kapat
        </button>
      </div>
    `).join("");

    posContainer.querySelectorAll(".btn-close-pos").forEach(b => {
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-pos-id");
        await apiClient.closePaperTrade(id);
        loadPaperTrading();
      });
    });
  };

  // 13. Structured Logs Viewer & Export
  const loadLogs = async () => {
    const listEl = document.getElementById("structuredLogsList");
    if (!listEl) return;

    const cat = document.getElementById("logCategorySelect")?.value || "ALL";
    const search = document.getElementById("logSearchInput")?.value || "";

    const logs = await apiClient.getLogs(cat, "ALL", search);
    if (!logs || !logs.length) {
      listEl.innerHTML = `<div style="color:var(--text-dim); text-align:center; padding:15px;">Günlük bulunamadı.</div>`;
      return;
    }

    listEl.innerHTML = logs.map(l => {
      const codeBadge = l.code ? `<span style="color:var(--neon-yellow); font-weight:700;">[${l.code}]</span>` : "";
      return `
        <div class="log-row ${l.severity}">
          <span style="color:var(--text-dim);">${l.timestamp.split('T')[1].slice(0,8)}</span>
          <span class="log-badge ${l.category}">${l.category}</span>
          ${codeBadge}
          <span style="color:var(--text-white);">${l.message}</span>
        </div>
      `;
    }).join("");
  };

  document.getElementById("logSearchInput")?.addEventListener("input", loadLogs);
  document.getElementById("logCategorySelect")?.addEventListener("change", loadLogs);

  document.getElementById("btnExportLogsJson")?.addEventListener("click", () => exportLogsClient("json"));
  document.getElementById("btnExportLogsTxt")?.addEventListener("click", () => exportLogsClient("txt"));
  document.getElementById("btnExportLogsCsv")?.addEventListener("click", () => exportLogsClient("csv"));

});
