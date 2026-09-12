import { createStudioShell } from './studio-shell.js';
import { exportPresets } from './export-image.js';

function bindRange({ id, valueId, state, key, onChange, format = (v) => Number(v).toFixed(2), event = 'input' }) {
  const input = document.getElementById(id);
  const output = document.getElementById(valueId);
  if (!input || !output) return;

  input.value = String(state[key]);
  output.textContent = format(state[key]);

  input.addEventListener(event, () => {
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

  const exportPreset=document.getElementById('exportPresetInput');
  const exportWidth=document.getElementById('exportWidthInput');
  const exportHeight=document.getElementById('exportHeightInput');
  const exportAspectLock=document.getElementById('exportAspectLockInput');
  const exportFormat=document.getElementById('exportFormatInput');
  const exportTransparent=document.getElementById('exportTransparentInput');
  const exportDetail=document.getElementById('exportDetailInput');
  const exportEffects=document.getElementById('exportEffectsInput');
  let exportAspect=state.exportWidth/state.exportHeight;
  const setExportDimensions=(width,height)=>{
    state.exportWidth=Math.max(256,Math.min(8192,Math.round(width)));
    state.exportHeight=Math.max(256,Math.min(8192,Math.round(height)));
    if(exportWidth)exportWidth.value=String(state.exportWidth);
    if(exportHeight)exportHeight.value=String(state.exportHeight);
  };
  setExportDimensions(state.exportWidth,state.exportHeight);
  if(exportPreset){exportPreset.value=state.exportPreset;exportPreset.addEventListener('change',()=>{
    state.exportPreset=exportPreset.value;
    const size=state.exportPreset==='viewport'?callbacks.getViewportSize():exportPresets[state.exportPreset];
    if(size){setExportDimensions(size.width,size.height);exportAspect=state.exportWidth/state.exportHeight;}
  });}
  const commitExportDimension=(axis)=>{
    const value=Number(axis==='width'?exportWidth?.value:exportHeight?.value);
    if(!Number.isFinite(value))return setExportDimensions(state.exportWidth,state.exportHeight);
    if(axis==='width')setExportDimensions(value,state.exportAspectLock?value/exportAspect:state.exportHeight);
    else setExportDimensions(state.exportAspectLock?value*exportAspect:state.exportWidth,value);
    if(!state.exportAspectLock)exportAspect=state.exportWidth/state.exportHeight;
    state.exportPreset='custom';if(exportPreset)exportPreset.value='custom';
  };
  exportWidth?.addEventListener('change',()=>commitExportDimension('width'));
  exportHeight?.addEventListener('change',()=>commitExportDimension('height'));
  if(exportAspectLock){exportAspectLock.checked=state.exportAspectLock;exportAspectLock.addEventListener('change',()=>{state.exportAspectLock=exportAspectLock.checked;exportAspect=state.exportWidth/state.exportHeight;});}
  const syncExportFormat=()=>{
    const jpeg=state.exportFormat==='jpeg';
    if(exportTransparent){exportTransparent.disabled=jpeg;if(jpeg){exportTransparent.checked=false;state.exportTransparent=false;}}
    const quality=document.getElementById('exportQualityInput');if(quality)quality.disabled=state.exportFormat==='png';
  };
  if(exportFormat){exportFormat.value=state.exportFormat;exportFormat.addEventListener('change',()=>{state.exportFormat=exportFormat.value;syncExportFormat();});}
  if(exportTransparent){exportTransparent.checked=state.exportTransparent;exportTransparent.addEventListener('change',()=>{state.exportTransparent=exportTransparent.checked;});}
  if(exportDetail){exportDetail.value=state.exportDetail;exportDetail.addEventListener('change',()=>{state.exportDetail=exportDetail.value;});}
  if(exportEffects){exportEffects.checked=state.exportEffects;exportEffects.addEventListener('change',()=>{state.exportEffects=exportEffects.checked;});}
  syncExportFormat();
  const surfaceInput=document.getElementById('surfaceInput');
  const surfaceDetailInput=document.getElementById('surfaceDetailInput');
  const surfaceDeformityInput=document.getElementById('surfaceDeformityInput');
  const syncSurfaceFields=()=>{
    const imported=state.surface==='imported',deformable=state.surface==='rock'||state.surface==='faceted-rock';
    if(surfaceDetailInput)surfaceDetailInput.disabled=imported;
    if(surfaceDeformityInput)surfaceDeformityInput.disabled=!deformable;
  };
  if(surfaceInput){surfaceInput.value=state.surface;surfaceInput.addEventListener('change',()=>{state.surface=surfaceInput.value;syncSurfaceFields();callbacks.onSurface(state.surface);});}
  if(surfaceDetailInput){surfaceDetailInput.value=state.surfaceDetail;surfaceDetailInput.addEventListener('change',()=>{state.surfaceDetail=surfaceDetailInput.value;callbacks.onSurfaceDetail(state.surfaceDetail);});}
  syncSurfaceFields();
  bindSelect('surfaceTextureInput',state,'surfaceTexture',value=>callbacks.onSurfaceAppearance('texture',value));
  bindSelect('representationInput',state,'representation',value=>callbacks.onAppearance('representation',value));
  bindSelect('mossColorSourceInput',state,'mossColorSource',value=>callbacks.onAppearance('colorSource',value));
  for(const [id,key,target] of [['mossRootColorInput','mossRootColor','rootColor'],['mossTipColorInput','mossTipColor','tipColor'],['mossStressColorInput','mossStressColor','stressColor']]){
    const input=document.getElementById(id);if(input){input.value=state[key];input.addEventListener('input',()=>{state[key]=input.value;callbacks.onAppearance(target,input.value);});}
  }
  const colorInvert=document.getElementById('mossColorInvertInput');
  if(colorInvert){colorInvert.checked=state.mossColorInvert;colorInvert.addEventListener('change',()=>{state.mossColorInvert=colorInvert.checked;callbacks.onAppearance('invert',colorInvert.checked);});}
  for(const [id,key,target] of [['surfaceBaseColorInput','surfaceBaseColor','baseColor'],['surfaceAccentColorInput','surfaceAccentColor','accentColor']]){
    const input=document.getElementById(id);if(input){input.value=state[key];input.addEventListener('input',()=>{state[key]=input.value;callbacks.onSurfaceAppearance(target,input.value);});}
  }

  bindRange({
    id: "moistureInput",
    valueId: "moistureValue",
    state,
    key: "moisture",
    onChange: (value) => callbacks.onEnvironment("moisture", value),
  });
  bindRange({id:'surfaceDeformityInput',valueId:'surfaceDeformityValue',state,key:'surfaceDeformity',event:'change',onChange:value=>callbacks.onSurfaceDeformity(value)});
  for(const config of [
    ['surfaceTextureScaleInput','surfaceTextureScaleValue','surfaceTextureScale','textureScale'],
    ['surfaceTextureStrengthInput','surfaceTextureStrengthValue','surfaceTextureStrength','textureStrength'],
    ['surfaceRoughnessInput','surfaceRoughnessValue','surfaceRoughness','roughness'],
  ])bindRange({id:config[0],valueId:config[1],state,key:config[2],onChange:value=>callbacks.onSurfaceAppearance(config[3],value)});
  bindRange({
    id: 'exportQualityInput',
    valueId: 'exportQualityValue',
    state,
    key: 'exportQuality',
    format: (value) => `${Math.round(value*100)}%`,
    onChange: () => {},
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

  const speciesSelect = document.getElementById("mossTypeInput");
  const speciesDescription=document.getElementById('mossTypeDescription');
  if (speciesSelect) {
    speciesSelect.innerHTML = "";
    (state.speciesCatalog || []).forEach((species) => {
      const option = document.createElement("option");
      option.value = String(species.id);
      option.textContent = species.name;
      speciesSelect.append(option);
    });
    speciesSelect.value = String(state.mossTypeId);
    const syncTypeDescription=()=>{if(speciesDescription)speciesDescription.textContent=state.speciesCatalog?.[state.mossTypeId]?.description||'';};
    syncTypeDescription();
    speciesSelect.addEventListener("change", () => {
      const next = Number(speciesSelect.value);
      state.mossTypeId = next;
      state.paintSpeciesId = next;
      syncTypeDescription();callbacks.onMossTypeSelect(next);
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
  bindButton('convertMossTypeBtn',()=>callbacks.onApplyMossType('convert',state.mossTypeId));
  bindButton('reseedMossTypeBtn',()=>callbacks.onApplyMossType('reseed',state.mossTypeId));
  bindButton('macroViewBtn', () => callbacks.onViewPreset('macro'));
  bindButton('captureBtn', () => callbacks.onCaptureView());
  bindButton("exportSnapshotBtn", () => callbacks.onExportImage({
    width:state.exportWidth,height:state.exportHeight,format:state.exportFormat,quality:state.exportQuality,
    transparent:state.exportTransparent,detail:state.exportDetail,effects:state.exportEffects,preset:state.exportPreset,
  }));
  bindButton("exportReportBtn", () => callbacks.onExportReport());
  bindButton("widgetResetBtn", () => callbacks.onViewPreset("iso"));

  const shell = createStudioShell();
  const setUtilityTab = shell.setTab;
  const paintBrushToolBtn=document.getElementById('paintBrushToolBtn');
  const paintEraserToolBtn=document.getElementById('paintEraserToolBtn');
  const selectPaintTool=erase=>{
    state.paintErase=erase;callbacks.onPaintSetting('paintErase',erase);callbacks.onPaintToggle(true);setPaintEnabled(true);
    shell.setToolPanel('paint');
  };
  paintBrushToolBtn?.addEventListener('click',()=>selectPaintTool(false));
  paintEraserToolBtn?.addEventListener('click',()=>selectPaintTool(true));
  const surfaceFileInput=document.getElementById('surfaceFileInput');
  const surfaceImportStatus=document.getElementById('surfaceImportStatus');
  surfaceFileInput?.addEventListener('change',async()=>{
    const file=surfaceFileInput.files?.[0];if(!file)return;
    if(surfaceImportStatus)surfaceImportStatus.textContent=`Importing ${file.name}…`;
    try{const result=await callbacks.onImportSurface(file);setImportedSurface(result.name);if(surfaceImportStatus)surfaceImportStatus.textContent=`${result.name} · ${result.triangleCount.toLocaleString()} triangles`;}
    catch(error){if(surfaceImportStatus)surfaceImportStatus.textContent=error.message;}
    finally{surfaceFileInput.value='';}
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
    paintBrushToolBtn?.setAttribute('aria-pressed',String(enabled&&!state.paintErase));
    paintEraserToolBtn?.setAttribute('aria-pressed',String(enabled&&state.paintErase));
  }

  function setImportedSurface(name) {
    const option=surfaceInput?.querySelector('option[value="imported"]');
    if(option){option.disabled=false;option.textContent=name||'Imported model';}
    state.surface='imported';if(surfaceInput)surfaceInput.value='imported';syncSurfaceFields();
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
    setImportedSurface,
  };
}
