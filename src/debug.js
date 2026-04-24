function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNow() {
  return new Date().toLocaleTimeString([], { hour12: false });
}

export function createDiagnostics({ simulation, mossRenderer, uiState }) {
  const metricEls = {
    fps: document.getElementById("metricFps"),
    frameMs: document.getElementById("metricFrameMs"),
    ticks: document.getElementById("metricTicks"),
    tickMs: document.getElementById("metricTickMs"),
    activeCells: document.getElementById("metricActiveCells"),
    density: document.getElementById("metricDensity"),
    clumps: document.getElementById("metricClumps"),
    batch: document.getElementById("metricBatch"),
    paintOps: document.getElementById("metricPaintOps"),
    lastPaint: document.getElementById("metricLastPaint"),
  };
  const logEl = document.getElementById("debugLog");
  const copyBtn = document.getElementById("copyDebugBtn");

  let smoothedFrameMs = 16.6;
  let tickCounter = 0;
  let tickWindowMs = 0;
  let ticksPerSecond = 0;
  const logBuffer = [];

  function pushLog(message) {
    const line = `[${formatNow()}] ${message}`;
    logBuffer.unshift(line);
    while (logBuffer.length > 8) logBuffer.pop();
    logEl.innerHTML = logBuffer.map((entry) => `<div class="koke-debug__log-line">${entry}</div>`).join("");
  }

  async function copySnapshot() {
    const payload = buildSnapshot();
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      pushLog("Snapshot copied to clipboard.");
    } catch (error) {
      pushLog(`Clipboard copy failed: ${error.message}`);
    }
  }

  function buildSnapshot() {
    const simStats = simulation.getStats();
    const renderStats = mossRenderer.getStats();
    return {
      capturedAt: new Date().toISOString(),
      ui: { ...uiState },
      simulation: simStats,
      rendering: renderStats,
      performance: {
        fps: Number((1000 / Math.max(0.001, smoothedFrameMs)).toFixed(1)),
        frameMs: Number(smoothedFrameMs.toFixed(2)),
        simTicksPerSecond: Number(ticksPerSecond.toFixed(2)),
      },
    };
  }

  copyBtn?.addEventListener("click", copySnapshot);

  function update(frameMs, simStepped) {
    smoothedFrameMs = smoothedFrameMs * 0.9 + frameMs * 0.1;
    tickWindowMs += frameMs;
    if (simStepped) tickCounter += 1;

    if (tickWindowMs >= 500) {
      ticksPerSecond = (tickCounter * 1000) / tickWindowMs;
      tickCounter = 0;
      tickWindowMs = 0;
    }

    const simStats = simulation.getStats();
    const renderStats = mossRenderer.getStats();

    metricEls.fps.textContent = (1000 / Math.max(0.001, smoothedFrameMs)).toFixed(1);
    metricEls.frameMs.textContent = smoothedFrameMs.toFixed(2);
    metricEls.ticks.textContent = ticksPerSecond.toFixed(2);
    metricEls.tickMs.textContent = simStats.lastTickMs.toFixed(2);
    metricEls.activeCells.textContent = formatPercent(simStats.activeRatio);
    metricEls.density.textContent = simStats.avgDensity.toFixed(3);
    metricEls.clumps.textContent = `${renderStats.clumpCount}/${renderStats.maxClumps}`;
    metricEls.batch.textContent = `${simStats.lastBatchSize} cells`;
    metricEls.paintOps.textContent = String(simStats.paintOps);
    metricEls.lastPaint.textContent = `${simStats.lastPaintCount} cells`;
  }

  pushLog("Diagnostics initialized.");

  return {
    update,
    pushLog,
    buildSnapshot,
  };
}
