import { createStudioShell } from './studio-shell.js';

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

function bindSelect(id, state, key, onChange) {
  const input=document.getElementById(id);if(!input)return;
  input.value=state[key];input.addEventListener('change',()=>{state[key]=input.value;onChange(input.value);});
}

export function createUI(initialState, callbacks) {
  const state = { ...initialState };
  for(const key of ['softFocus','dew']) {
    const input=document.getElementById(key+'Input');
    if(input) {input.checked=state[key]; input.addEventListener('change',()=>{state[key]=input.checked;callbacks.onViewSetting(key,input.checked);});}
  }
  const detail=document.getElementById('detailInput');
  if(detail) {detail.value=state.detail;detail.addEventListener('change',()=>{state.detail=detail.value;callbacks.onViewSetting('detail',detail.value);});}
  bindSelect('surfaceInput',state,'surface',callbacks.onSurface);
  bindSelect('surfaceDetailInput',state,'surfaceDetail',callbacks.onSurfaceDetail);
  bindSelect('representationInput',state,'representation',value=>callbacks.onAppearance('representation',value));
  bindSelect('mossColorSourceInput',state,'mossColorSource',value=>callbacks.onAppearance('colorSource',value));
  for(const [id,key,target] of [['mossRootColorInput','mossRootColor','rootColor'],['mossTipColorInput','mossTipColor','tipColor'],['mossStressColorInput','mossStressColor','stressColor']]){
    const input=document.getElementById(id);if(input){input.value=state[key];input.addEventListener('input',()=>{state[key]=input.value;callbacks.onAppearance(target,input.value);});}
  }
  const colorInvert=document.getElementById('mossColorInvertInput');
  if(colorInvert){colorInvert.checked=state.mossColorInvert;colorInvert.addEventListener('change',()=>{state.mossColorInvert=colorInvert.checked;callbacks.onAppearance('invert',colorInvert.checked);});}

  bindRange({
    id: "moistureInput",
    valueId: "moistureValue",
    state,
    key: "moisture",
    onChange: (value) => callbacks.onEnvironment("moisture", value),
  });
  for(const config of [
    ['mossDensityInput','mossDensityValue','mossDensity','density'],
    ['mossScaleInput','mossScaleValue','mossScale','scale'],
    ['mossAspectInput','mossAspectValue','mossAspect','aspect'],
    ['mossOrientationInput','mossOrientationValue','mossOrientation','orientation'],
    ['mossColorRangeInput','mossColorRangeValue','mossColorRange','colorRange'],
    ['mossTextureScaleInput','mossTextureScaleValue','mossTextureScale','textureScale'],
    ['mossTextureStrengthInput','mossTextureStrengthValue','mossTextureStrength','textureStrength'],
  ]) bindRange({id:config[0],valueId:config[1],state,key:config[2],onChange:value=>callbacks.onAppearance(config[3],value)});
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
    id: "playbackSpeedInput",
    valueId: "playbackSpeedValue",
    state,
    key: "playbackSpeed",
    format: (v) => `${Number(v)}x`,
    onChange: (value) => callbacks.onPerfSetting("playbackSpeed", value),
  });
  bindRange({
    id: "cycleSpeedInput",
    valueId: "cycleSpeedValue",
    state,
    key: "cycleSpeed",
    onChange: (value) => callbacks.onEnvironment("cycleSpeed", value),
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

  bindButton('simPlayBtn', () => callbacks.onPlayToggle(!state.playing, 'transport'));
  bindButton('simStepBtn', () => callbacks.onStep());
  bindButton('simRestartBtn', () => callbacks.onPreset(state.initialState));
  bindButton('maturePresetBtn', () => callbacks.onPreset('mature'));
  bindButton('seedPresetBtn', () => callbacks.onPreset('seed'));
  bindButton('barePresetBtn', () => callbacks.onPreset('bare'));
  bindButton('macroViewBtn', () => callbacks.onViewPreset('macro'));
  bindButton('captureBtn', () => callbacks.onCaptureView());
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

  const shell = createStudioShell();
  const setUtilityTab = shell.setTab;

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
    const button = document.getElementById('simPlayBtn');
    const label = playing ? 'Pause' : 'Play';
    button.querySelector('span').textContent = label;
    button.querySelector('i').className = playing ? 'iconoir-pause' : 'iconoir-play-solid';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.setAttribute('aria-pressed', String(playing));
  }

  function setInitialState(mode) {
    state.initialState = mode;
    for (const name of ['mature', 'seed', 'bare']) {
      const button = document.getElementById(name + 'PresetBtn');
      button.setAttribute('aria-pressed', String(name === mode));
      button.classList.toggle('ds-btn-primary', name === mode);
    }
  }

  function setTime(seconds) {
    const hundredths = Math.floor((seconds + 1e-8) * 100);
    document.getElementById('elapsedTime').textContent = `${String(Math.floor(hundredths / 6000)).padStart(2, '0')}:${String(Math.floor(hundredths / 100) % 60).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`;
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
  setInitialState(state.initialState);

  return {
    state,
    setPlaying,
    setPaintEnabled,
    setUtilityTab,
    setTime,
    setInitialState,
  };
}
