/**
 * Reusable NeonOrbitProgress Component
 * Complies strictly with MASTER_PROMPT_TR:
 * - Central glowing core
 * - Circular orbit rings
 * - Moving particles & light trails
 * - Centered percentage readout
 * - Smooth 25% / 50% / 75% / 100% transitions
 * - Supports downloads, sync, training, backtest, signal scanner
 */

class NeonOrbitProgress {
  constructor(containerElement, options = {}) {
    this.container = typeof containerElement === "string" 
      ? document.querySelector(containerElement) 
      : containerElement;
    
    this.size = options.size || 210;
    this.label = options.label || "BTCUSDT • MULTI TIMEFRAME";
    this.percent = options.initialPercent || 0;
    this.sublabel = options.sublabel || "INITIALIZING";
    
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="orbit-box" style="width: ${this.size}px; height: ${this.size}px;">
        <div class="orbit-particle p1"></div>
        <div class="orbit-particle p2"></div>
        <div class="orbit-particle p3"></div>
        <div class="orbit-core"></div>
        <div class="orbit-percent" id="orbitPercentVal">${this.percent}%</div>
      </div>
      <div class="card-label" style="text-align:center; margin-top: 6px; font-size:11px;" id="orbitLabel">${this.label}</div>
      <div style="text-align:center; font-size: 10px; color: var(--neon-cyan); letter-spacing:1px; font-weight:700;" id="orbitSublabel">${this.sublabel}</div>
    `;
    this.percentEl = this.container.querySelector("#orbitPercentVal");
    this.labelEl = this.container.querySelector("#orbitLabel");
    this.sublabelEl = this.container.querySelector("#orbitSublabel");
  }

  setProgress(targetPercent, sublabel = null, durationMs = 400) {
    targetPercent = Math.max(0, Math.min(100, Math.round(targetPercent)));
    if (sublabel && this.sublabelEl) {
      this.sublabelEl.textContent = sublabel;
    }

    const start = this.percent;
    const diff = targetPercent - start;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const current = Math.round(start + diff * progress);
      this.percent = current;
      if (this.percentEl) {
        this.percentEl.textContent = `${current}%`;
      }
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  setLabel(text) {
    this.label = text;
    if (this.labelEl) this.labelEl.textContent = text;
  }

  runSequence(steps, onComplete = null) {
    /**
     * Helper to run 25 -> 50 -> 75 -> 100% transitions with labels
     */
    let idx = 0;
    const nextStep = () => {
      if (idx >= steps.length) {
        if (onComplete) onComplete();
        return;
      }
      const s = steps[idx];
      this.setProgress(s.percent, s.label, s.duration || 600);
      idx++;
      setTimeout(nextStep, (s.duration || 600) + (s.pause || 300));
    };
    nextStep();
  }
}

window.NeonOrbitProgress = NeonOrbitProgress;
