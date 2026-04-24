function bindRange({ id, valueId, state, key, onChange, format = (v) => Number(v).toFixed(2) }) {
  const input = document.getElementById(id);
  const output = document.getElementById(valueId);
  if (!input || !output) return;

  input.value = String(state[key]);
  output.textContent = format(state[key]);

  input.addEventListener("input", () => {
    const value = Number(input.value);
    state[key] = value;
    output.textContent = format(value);
    onChange(value);
  });
}

function bindButton(id, handler) {
  const btn = document.getElementById(id);
  btn?.addEventListener("click", handler);
}

export function createUI(initialState, callbacks) {
  const state = { ...initialState };

  bindRange({
    id: "moistureInput",
    valueId: "moistureValue",
    state,
    key: "moisture",
    onChange: (value) => callbacks.onEnvironment("moisture", value),
  });
  bindRange({
    id: "slopeBiasInput",
    valueId: "slopeBiasValue",
    state,
    key: "slopeBias",
    onChange: (value) => callbacks.onEnvironment("slopeBias", value),
  });
  bindRange({
    id: "growthRateInput",
    valueId: "growthRateValue",
    state,
    key: "growthRate",
    onChange: (value) => callbacks.onEnvironment("growthRate", value),
  });
  bindRange({
    id: "decayRateInput",
    valueId: "decayRateValue",
    state,
    key: "decayRate",
    onChange: (value) => callbacks.onEnvironment("decayRate", value),
  });
  bindRange({
    id: "diffusionRateInput",
    valueId: "diffusionRateValue",
    state,
    key: "diffusionRate",
    onChange: (value) => callbacks.onEnvironment("diffusionRate", value),
  });
  bindRange({
    id: "colonizationInput",
    valueId: "colonizationValue",
    state,
    key: "colonization",
    onChange: (value) => callbacks.onEnvironment("colonization", value),
  });
  bindRange({
    id: "gravityCreepInput",
    valueId: "gravityCreepValue",
    state,
    key: "gravityCreep",
    onChange: (value) => callbacks.onEnvironment("gravityCreep", value),
  });
  bindRange({
    id: "lightAzimuthInput",
    valueId: "lightAzimuthValue",
    state,
    key: "lightAzimuth",
    format: (v) => `${Math.round(v)} deg`,
    onChange: (value) => callbacks.onLightAngles(value, state.lightElevation),
  });
  bindRange({
    id: "lightElevationInput",
    valueId: "lightElevationValue",
    state,
    key: "lightElevation",
    format: (v) => `${Math.round(v)} deg`,
    onChange: (value) => callbacks.onLightAngles(state.lightAzimuth, value),
  });
  bindRange({
    id: "tickEveryFramesInput",
    valueId: "tickEveryFramesValue",
    state,
    key: "tickEveryFrames",
    format: (v) => `${Math.round(v)}f`,
    onChange: (value) => callbacks.onPerfSetting("tickEveryFrames", value),
  });
  bindRange({
    id: "batchRatioInput",
    valueId: "batchRatioValue",
    state,
    key: "batchRatio",
    onChange: (value) => callbacks.onPerfSetting("batchRatio", value),
  });

  bindRange({
    id: "paintRadiusInput",
    valueId: "paintRadiusValue",
    state,
    key: "paintRadius",
    onChange: (value) => callbacks.onPaintSetting("paintRadius", value),
  });
  bindRange({
    id: "paintStrengthInput",
    valueId: "paintStrengthValue",
    state,
    key: "paintStrength",
    onChange: (value) => callbacks.onPaintSetting("paintStrength", value),
  });

  const speciesSelect = document.getElementById("paintSpeciesSelect");
  if (speciesSelect) {
    speciesSelect.innerHTML = "";
    (state.speciesCatalog || []).forEach((species) => {
      const option = document.createElement("option");
      option.value = String(species.id);
      option.textContent = species.name;
      speciesSelect.append(option);
    });
    speciesSelect.value = String(state.paintSpeciesId);
    speciesSelect.addEventListener("input", () => {
      const next = Number(speciesSelect.value);
      state.paintSpeciesId = next;
      callbacks.onPaintSetting("paintSpeciesId", next);
    });
  }

  const paintEraseInput = document.getElementById("paintEraseInput");
  if (paintEraseInput) {
    paintEraseInput.checked = state.paintErase;
    paintEraseInput.addEventListener("input", () => {
      const erase = paintEraseInput.checked;
      state.paintErase = erase;
      callbacks.onPaintSetting("paintErase", erase);
    });
  }

  const wireframeInput = document.getElementById("wireframeInput");
  if (wireframeInput) {
    wireframeInput.checked = state.wireframe;
    wireframeInput.addEventListener("input", () => {
      state.wireframe = wireframeInput.checked;
      callbacks.onWireframe(wireframeInput.checked);
    });
  }

  bindButton("simStartBtn", () => callbacks.onPlayToggle(true, "start-button"));
  bindButton("simPauseBtn", () => callbacks.onPlayToggle(false, "pause-button"));
  bindButton("snapshotCaptureBtn", () => callbacks.onCaptureView());
  bindButton("exportSnapshotBtn", () => callbacks.onExportPng());
  bindButton("exportReportBtn", () => callbacks.onExportReport());
  bindButton("widgetResetBtn", () => callbacks.onViewPreset("iso"));

  const paintToggleBtn = document.getElementById("paintToggleBtn");
  paintToggleBtn?.addEventListener("click", () => {
    const next = !state.paintEnabled;
    state.paintEnabled = next;
    callbacks.onPaintToggle(next);
    setPaintEnabled(next);
  });

  const utilityTabs = Array.from(document.querySelectorAll("[data-utility-tab]"));
  const utilityPanels = Array.from(document.querySelectorAll("[data-utility-panel]"));

  function setUtilityTab(tabName) {
    utilityTabs.forEach((tab) => {
      const isActive = tab.dataset.utilityTab === tabName;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", isActive ? "true" : "false");
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    utilityPanels.forEach((panel) => {
      const isActive = panel.dataset.utilityPanel === tabName;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });
  }

  utilityTabs.forEach((tab) => {
    tab.addEventListener("click", () => setUtilityTab(tab.dataset.utilityTab));
  });

  const presetButtons = [
    { id: "widgetIsoBtn", preset: "iso" },
    { id: "widgetFrontBtn", preset: "front" },
    { id: "widgetTopBtn", preset: "top" },
    { id: "widgetLeftBtn", preset: "left" },
  ];
  presetButtons.forEach(({ id, preset }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => callbacks.onViewPreset(preset));
  });

  function setPlaying(playing) {
    state.playing = playing;
    const startBtn = document.getElementById("simStartBtn");
    const pauseBtn = document.getElementById("simPauseBtn");
    if (startBtn) {
      startBtn.classList.toggle("ds-btn-primary", playing);
      startBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    }
    if (pauseBtn) {
      pauseBtn.classList.toggle("ds-btn-primary", !playing);
      pauseBtn.setAttribute("aria-pressed", !playing ? "true" : "false");
    }
  }

  function setPaintEnabled(enabled) {
    state.paintEnabled = enabled;
    if (paintToggleBtn) {
      paintToggleBtn.classList.toggle("ds-btn-primary", enabled);
      paintToggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    }
  }

  setPlaying(state.playing);
  setPaintEnabled(state.paintEnabled);
  setUtilityTab("view");

  return {
    state,
    setPlaying,
    setPaintEnabled,
    setUtilityTab,
  };
}
