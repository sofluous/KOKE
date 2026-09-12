import { createScene, createSurfaceGeometry, directionFromAngles, handleResize } from "./scene.js";
import { mossSpeciesCatalog } from "./simulation.js";
import { createSurfaceSampler, surfaceCatalog } from './substrate.js';
import { SporeSimulation } from './spores.js';
import { createViewEffects } from './view-effects.js';
import { FieldSimulation, defaultFieldEnvironment } from "./field-sim.js";
import { createFieldRenderer } from "./field-renderer.js";
import { createUI } from "./ui.js";
import { createDiagnostics } from "./debug.js";
import { normalizeExportSettings } from './export-image.js';
import { importRadialGlb } from './model-import.js';

const canvas = document.getElementById("viewport");
const viewportWrap = document.getElementById("viewportWrap");
const brushPreview = document.getElementById("brushPreview");
const snapshotThumb = document.getElementById("snapshotThumb");
const snapshotTitle = document.getElementById("snapshotTitle");
const snapshotMeta = document.getElementById("snapshotMeta");

function createStartupSeed() {
  const raw=new URLSearchParams(window.location.search).get('seed');
  const requested=raw===null?NaN:Number(raw);
  if(Number.isInteger(requested)&&requested>=0&&requested<=0xffffffff)return requested;
  if(globalThis.crypto?.getRandomValues)return crypto.getRandomValues(new Uint32Array(1))[0];
  return (Date.now()^Math.floor(performance.now()*1000))>>>0;
}

const startupSeed=createStartupSeed();
const startupSurface='sphere';
const startupSurfaceDetail='low';
const startupRepresentation='surface';
const startupRenderDetail='low';
const startupDefinition=surfaceCatalog[startupSurface];
const { scene, camera, renderer, controls, lights, floor, meshGeometry, THREE } = createScene(canvas, {
  sampleSurface:startupDefinition.sample,
  surfaceDetail:startupSurfaceDetail,
});
const effects = createViewEffects(renderer, scene, camera, controls);

const initialLightAzimuth = 18;
const initialLightElevation = 54;
const lightDir = directionFromAngles(initialLightAzimuth, initialLightElevation);
lights.sun.position.copy(lightDir.clone().multiplyScalar(8));

const surface = { sampleSurface: startupDefinition.sample };
const simulation = new FieldSimulation(surface, {
  environment: defaultFieldEnvironment,
  speciesCatalog: mossSpeciesCatalog,
  lightDirection: { x: lightDir.x, y: lightDir.y, z: lightDir.z },
  mapSize: 128,
  initialSpeciesId: 0,
  seed:startupSeed,
});

const speciesCatalog = simulation.getSpeciesCatalog();
const mossRenderer = createFieldRenderer(THREE, scene, meshGeometry, {
  speciesPalette: speciesCatalog.map((species) => species.color),
  coverageMapSize: simulation.mapSize,
  sampleSurface: startupDefinition.sample,
  seed:startupSeed,
  initialQuality:startupRenderDetail,
  initialRepresentation:startupRepresentation,
  initialDensity:0.5,
});
mossRenderer.setQuality(startupRenderDetail);
mossRenderer.setRepresentation(startupRepresentation);
mossRenderer.setDensity(0.5);
mossRenderer.setSurfaceAppearance({baseColor:'#252c2e',accentColor:'#586063',texture:'cracked',textureScale:14,textureStrength:0.7,roughness:0.88});
const spores = new SporeSimulation(simulation);
simulation.onStep = (dt) => spores.step(dt);
mossRenderer.setCoverage(simulation.fillCoverageMap());
simulation.setRunning(false);

let diagnostics;
const ui = createUI(
  {
    playing: false,
    initialState: 'mature',
    moisture: defaultFieldEnvironment.moisture,
    slopeBias: defaultFieldEnvironment.slopeBias,
    growthRate: defaultFieldEnvironment.growthRate,
    decayRate: defaultFieldEnvironment.decayRate,
    diffusionRate: defaultFieldEnvironment.diffusionRate,
    colonization: defaultFieldEnvironment.colonization,
    gravityCreep: defaultFieldEnvironment.gravityCreep,
    cycleSpeed: defaultFieldEnvironment.cycleSpeed,
    playbackSpeed: 1,
    softFocus: false,
    dew: false,
    detail: startupRenderDetail,
    surface: startupSurface,
    surfaceDetail: startupSurfaceDetail,
    surfaceDeformity:0.55,
    surfaceBaseColor:'#252c2e',
    surfaceAccentColor:'#586063',
    surfaceTexture:'cracked',
    surfaceTextureScale:14,
    surfaceTextureStrength:0.7,
    surfaceRoughness:0.88,
    representation: startupRepresentation,
    mossDensity: 0.5,
    mossScale: 1,
    mossAspect: 1,
    mossOrientation: 1,
    mossRootColor: '#24451f',
    mossTipColor: '#a5c950',
    mossStressColor: '#4b2814',
    mossColorSource: 'species',
    mossColorRange: 1,
    mossColorInvert: false,
    mossTextureScale: 18,
    mossTextureStrength: 0.22,
    mossTypeId: 0,
    lightAzimuth: initialLightAzimuth,
    lightElevation: initialLightElevation,
    wireframe: false,
    paintEnabled: false,
    paintRadius: 0.34,
    paintStrength: 0.72,
    paintSpeciesId: 0,
    paintErase: false,
    speciesCatalog,
    seed:startupSeed,
    exportPreset:'hd',
    exportWidth:1920,
    exportHeight:1080,
    exportAspectLock:true,
    exportFormat:'png',
    exportQuality:0.92,
    exportTransparent:false,
    exportDetail:'current',
    exportEffects:true,
  },
  {
    onPlayToggle(playing, source = "ui") {
      simulation.setRunning(playing);
      ui.setPlaying(playing);
      diagnostics?.pushLog(`Simulation ${playing ? "resumed" : "paused"} (${source}).`);
    },
    onEnvironment(key, value) {
      simulation.setEnvironment({ [key]: value });
      diagnostics?.pushLog(`Environment changed: ${key}=${Number(value).toFixed(3)}`);
    },
    onPerfSetting(key, value) {
      ui.state[key] = value;
    },
    onPreset(mode) {
      simulation.setRunning(false);
      ui.setPlaying(false);
      ui.setInitialState(mode);
      simulation.reset(mode,ui.state.mossTypeId);
      spores.reset();
      ui.setTime(0);
      mossRenderer.setCoverage(simulation.fillCoverageMap());
      diagnostics?.pushLog(`Scene reset: ${mode}.`);
    },
    onStep() {
      simulation.setRunning(false);
      ui.setPlaying(false);
      simulation.accumulator = 0;
      simulation.stepBatch();
      ui.setTime(simulation.time);
    },
    onViewSetting(key,value) {
      if(key==='softFocus') effects.setEnabled(value);
      if(key==='dew') mossRenderer.setDew(value);
      if(key==='detail') mossRenderer.setQuality(value);
    },
    onSurface(key) { applySurface(key,ui.state.surfaceDetail); },
    onSurfaceDetail(detail) { if(ui.state.surface!=='imported')applySurface(ui.state.surface,detail); },
    onSurfaceDeformity() { if(ui.state.surface==='rock'||ui.state.surface==='faceted-rock')applySurface(ui.state.surface,ui.state.surfaceDetail); },
    onSurfaceAppearance(key,value) {
      mossRenderer.setSurfaceAppearance({[key]:value});
      diagnostics?.pushLog(`Surface material changed: ${key}=${value}.`);
    },
    async onImportSurface(file) {
      const result=await importRadialGlb(THREE,file);importedSurface?.geometry.dispose();importedSurface=result;
      simulation.setRunning(false);ui.setPlaying(false);spores.reset();
      simulation.setSurface(result.sample);mossRenderer.setSurface(result.sample,result.geometry.clone());mossRenderer.setCoverage(simulation.fillCoverageMap());
      ui.state.surface='imported';diagnostics?.pushLog(`Imported radial GLB: ${result.name} (${result.triangleCount} triangles).`);
      return result;
    },
    onAppearance(key,value) {
      if(key==='representation')mossRenderer.setRepresentation(value);
      else if(key==='density')mossRenderer.setDensity(value);
      else mossRenderer.setAppearance({[key]:value});
      diagnostics?.pushLog(`Appearance changed: ${key}=${value}.`);
    },
    onMossTypeSelect(speciesId) {
      ui.state.paintSpeciesId=speciesId;
      diagnostics?.pushLog(`New growth type: ${speciesCatalog[speciesId]?.name||speciesId}.`);
    },
    onApplyMossType(mode,speciesId) {
      simulation.setRunning(false);ui.setPlaying(false);spores.reset();
      if(mode==='convert'){
        const converted=simulation.convertSpecies(speciesId);
        diagnostics?.pushLog(`Converted ${converted} colonies to ${speciesCatalog[speciesId].name}; biomass and age preserved.`);
      }else{
        simulation.reset('seed',speciesId);ui.setInitialState('seed');ui.setTime(0);
        diagnostics?.pushLog(`Scene reseeded with ${speciesCatalog[speciesId].name}.`);
      }
      mossRenderer.setCoverage(simulation.fillCoverageMap());
    },
    onPaintToggle(enabled) {
      canvas.classList.toggle("is-paint-mode", enabled);
      if (!enabled) hideBrushPreview();
      diagnostics?.pushLog(`Paint mode ${enabled ? "enabled" : "disabled"}.`);
    },
    onPaintSetting(key, value) {
      ui.state[key] = value;
      if (key === "paintSpeciesId") {
        const name = speciesCatalog[value]?.name || value;
        diagnostics?.pushLog(`Paint species: ${name}.`);
      }
    },
    onLightAngles(azimuth, elevation) {
      const direction = directionFromAngles(azimuth, elevation);
      lights.sun.position.copy(direction.clone().multiplyScalar(8));
      simulation.setLightDirection({ x: direction.x, y: direction.y, z: direction.z });
      diagnostics?.pushLog(`Light updated: az=${azimuth.toFixed(0)} el=${elevation.toFixed(0)}`);
    },
    onWireframe(value) {
      mossRenderer.setWireframe(value);
      diagnostics?.pushLog(`Wireframe ${value ? "enabled" : "disabled"}.`);
    },
    onCaptureView() {
      captureSnapshot(false);
      ui.setUtilityTab("export");
    },
    getViewportSize() {
      return {width:Math.max(1,canvas.clientWidth),height:Math.max(1,canvas.clientHeight)};
    },
    onExportImage(settings) {
      exportImage(settings);
      ui.setUtilityTab("export");
    },
    onExportReport() {
      exportReport();
      ui.setUtilityTab("export");
    },
    onViewPreset(preset) {
      setViewPreset(preset);
      diagnostics?.pushLog(`View preset: ${preset}`);
    },
  }
);

diagnostics = createDiagnostics({
  simulation,
  mossRenderer,
  uiState: ui.state,
  spores,
  renderer,
});
diagnostics.pushLog(`Simulation ready with seed ${startupSeed}. Press Play to begin.`);

let importedSurface=null;
function applySurface(key,detail) {
  if(key==='imported'&&importedSurface){
    simulation.setRunning(false);ui.setPlaying(false);simulation.setSurface(importedSurface.sample);spores.reset();
    mossRenderer.setSurface(importedSurface.sample,importedSurface.geometry.clone());mossRenderer.setCoverage(simulation.fillCoverageMap());
    diagnostics?.pushLog(`Surface changed: ${importedSurface.name}. Growth field preserved; spores cleared.`);return;
  }
  const definition=surfaceCatalog[key]||surfaceCatalog.rock;
  const sample=createSurfaceSampler(key,{seed:startupSeed,deformity:ui.state.surfaceDeformity});
  simulation.setRunning(false);ui.setPlaying(false);
  simulation.setSurface(sample);
  spores.reset();
  mossRenderer.setSurface(sample,createSurfaceGeometry(sample,detail,Boolean(definition.faceted)||key==='icosahedron'));
  mossRenderer.setCoverage(simulation.fillCoverageMap());
  diagnostics?.pushLog(`Surface changed: ${definition.name} (${detail}). Growth field preserved; spores cleared.`);
}

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
let isPainting = false;
let lastPaintLogAt = 0;
const cameraRight = new THREE.Vector3();
const worldP0 = new THREE.Vector3();
const worldP1 = new THREE.Vector3();
const ndcP0 = new THREE.Vector3();
const ndcP1 = new THREE.Vector3();

function pointerToNdc(event) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function paintFromEvent(event) {
  if (!ui.state.paintEnabled) return;
  pointerToNdc(event);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObject(mossRenderer.mesh, false);
  if (!hits.length) return;

  const painted = simulation.paintAt(mossRenderer.mesh.worldToLocal(hits[0].point.clone()), {
    radius: ui.state.paintRadius,
    strength: ui.state.paintStrength,
    speciesId: ui.state.paintSpeciesId,
    erase: ui.state.paintErase,
  });

  if (painted > 0) {
    const now = performance.now();
    if (now - lastPaintLogAt > 180) {
      diagnostics?.pushLog(
        `${ui.state.paintErase ? "Erase" : "Paint"} stroke: ${painted} texels @ r=${ui.state.paintRadius.toFixed(2)}`
      );
      lastPaintLogAt = now;
    }
  }
}

function hideBrushPreview() {
  brushPreview?.classList.remove("is-visible");
}

function updateBrushPreview(event) {
  if (!ui.state.paintEnabled || !brushPreview || !viewportWrap) {
    hideBrushPreview();
    return;
  }

  pointerToNdc(event);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObject(mossRenderer.mesh, false);
  if (!hits.length) {
    hideBrushPreview();
    return;
  }

  const hit = hits[0].point;
  const rect = canvas.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;

  camera.getWorldDirection(cameraRight);
  cameraRight.cross(camera.up).normalize();
  worldP0.copy(hit);
  worldP1.copy(hit).addScaledVector(cameraRight, ui.state.paintRadius);
  ndcP0.copy(worldP0).project(camera);
  ndcP1.copy(worldP1).project(camera);
  const radiusPx = Math.max(8, Math.abs(ndcP1.x - ndcP0.x) * rect.width * 0.5);

  brushPreview.style.left = `${localX}px`;
  brushPreview.style.top = `${localY}px`;
  brushPreview.style.width = `${radiusPx * 2}px`;
  brushPreview.style.height = `${radiusPx * 2}px`;
  brushPreview.classList.add("is-visible");
}

canvas.addEventListener("pointerdown", (event) => {
  if (!ui.state.paintEnabled || event.button !== 0) return;
  isPainting = true;
  controls.enabled = false;
  updateBrushPreview(event);
  paintFromEvent(event);
});

canvas.addEventListener("pointermove", (event) => {
  updateBrushPreview(event);
  if (!isPainting) return;
  paintFromEvent(event);
});

function stopPainting() {
  if (!isPainting) return;
  isPainting = false;
  controls.enabled = true;
}

canvas.addEventListener("pointerup", stopPainting);
canvas.addEventListener("pointerleave", () => {
  stopPainting();
  hideBrushPreview();
});
canvas.addEventListener("pointercancel", stopPainting);
window.addEventListener("pointerup", stopPainting);

function setViewPreset(preset) {
  if (preset === 'macro') {
    controls.target.set(0.65, 0.85, 1.3);
    camera.position.set(2.5, 2.3, 4.1);
    controls.update();
    return;
  }
  controls.target.set(0, 0.15, 0);
  const presets = {
    iso: new THREE.Vector3(5.4, 3.7, 6.3),
    front: new THREE.Vector3(0, 0.15, 8.2),
    top: new THREE.Vector3(0, 8.2, 0.001),
    left: new THREE.Vector3(-8.2, 0.15, 0),
  };
  const next = presets[preset] || presets.iso;
  camera.position.copy(next);
  camera.lookAt(controls.target);
  controls.update();
}

function saveTextFile(name, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(name, dataUrl) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

function canvasToBlob(type,quality) {
  return new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(new Error('Image encoding failed')),type,quality));
}

function downloadBlob(name,blob) {
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

let snapshotObjectUrl=null;
function showBlobPreview(blob,settings) {
  if(snapshotObjectUrl)URL.revokeObjectURL(snapshotObjectUrl);
  snapshotObjectUrl=URL.createObjectURL(blob);
  if(snapshotThumb)snapshotThumb.src=snapshotObjectUrl;
  if(snapshotTitle)snapshotTitle.textContent=`${settings.width} × ${settings.height} ${settings.format.toUpperCase()}`;
  if(snapshotMeta)snapshotMeta.textContent=new Date().toLocaleString();
}

let exportInProgress=false;
async function exportImage(input) {
  if(exportInProgress)return;
  exportInProgress=true;
  const requested=input.preset==='viewport'?{...input,width:canvas.clientWidth,height:canvas.clientHeight}:input;
  const settings=normalizeExportSettings(requested,{maxDimension:renderer.capabilities.maxTextureSize,maxPixels:33_177_600});
  const previous={
    running:simulation.running,pixelRatio:renderer.getPixelRatio(),aspect:camera.aspect,
    background:scene.background,fog:scene.fog,floorVisible:floor.visible,clearAlpha:renderer.getClearAlpha(),
    effects:effects.isEnabled(),detail:ui.state.detail,dew:ui.state.dew,
  };
  simulation.setRunning(false);ui.setPlaying(false);
  try {
    if(settings.detail!=='current')mossRenderer.setQuality(settings.detail);
    if(!settings.effects){effects.setEnabled(false);mossRenderer.setDew(false);}
    if(settings.transparent){scene.background=null;scene.fog=null;floor.visible=false;renderer.setClearAlpha(0);}
    renderer.setPixelRatio(1);renderer.setSize(settings.width,settings.height,false);
    camera.aspect=settings.width/settings.height;camera.updateProjectionMatrix();effects.resize(settings.width,settings.height);
    if(simulation.dirty)mossRenderer.setCoverage(simulation.fillCoverageMap());
    mossRenderer.update(simulation.time,spores);effects.render();
    const blob=await canvasToBlob(settings.mimeType,settings.quality);
    showBlobPreview(blob,settings);
    downloadBlob(`koke-${startupSeed}-${Date.now()}.${settings.extension}`,blob);
    diagnostics?.pushLog(`Image exported: ${settings.width}x${settings.height} ${settings.format.toUpperCase()}${settings.transparent?' alpha':''}.`);
  } catch(error) {
    diagnostics?.pushLog(`Image export failed: ${error.message}.`);
    console.error(error);
  } finally {
    scene.background=previous.background;scene.fog=previous.fog;floor.visible=previous.floorVisible;renderer.setClearAlpha(previous.clearAlpha);
    renderer.setPixelRatio(previous.pixelRatio);handleResize(renderer,camera,canvas);camera.aspect=previous.aspect;camera.updateProjectionMatrix();effects.resize(canvas.clientWidth,canvas.clientHeight);
    effects.setEnabled(previous.effects);mossRenderer.setQuality(previous.detail);mossRenderer.setDew(previous.dew);
    simulation.setRunning(previous.running);ui.setPlaying(previous.running);exportInProgress=false;
  }
}

function captureSnapshot(download) {
  if (simulation.dirty) mossRenderer.setCoverage(simulation.fillCoverageMap());
  mossRenderer.update(simulation.time, spores);
  effects.render();
  const png = renderer.domElement.toDataURL("image/png");
  if (snapshotThumb) snapshotThumb.src = png;
  if (snapshotTitle) snapshotTitle.textContent = "Viewport snapshot captured";
  if (snapshotMeta) snapshotMeta.textContent = new Date().toLocaleString();
  diagnostics?.pushLog("Snapshot captured.");

  if (download) {
    downloadDataUrl(`koke-snapshot-${Date.now()}.png`, png);
    diagnostics?.pushLog("PNG exported.");
  }
}

function exportReport() {
  const report = {
    capturedAt: new Date().toISOString(),
    diagnostics: diagnostics.buildSnapshot(),
    ui: { ...ui.state },
  };
  saveTextFile(`koke-report-${Date.now()}.json`, JSON.stringify(report, null, 2));
  diagnostics?.pushLog("Report exported.");
}

function resizeViewport() {
  handleResize(renderer, camera, canvas);
  effects.resize(canvas.clientWidth, canvas.clientHeight);
}
window.addEventListener('resize', resizeViewport);
const viewportObserver = new ResizeObserver(resizeViewport);
viewportObserver.observe(viewportWrap);
resizeViewport();

let lastFrameTime = performance.now();
let lastIdleFrame = 0;
function animate() {
  const now = performance.now();
  if (!simulation.running && !isPainting && now-lastIdleFrame<1000/15) {
    requestAnimationFrame(animate);
    return;
  }
  if (!simulation.running) lastIdleFrame=now;
  const frameMs = now - lastFrameTime;
  lastFrameTime = now;

  const simStepped = simulation.updateFrame(frameMs / 1000 * ui.state.playbackSpeed);
  if (simStepped) ui.setTime(simulation.time);

  if (simulation.dirty) {
    mossRenderer.setCoverage(simulation.fillCoverageMap());
  }
  mossRenderer.update(simulation.time, spores);

  diagnostics.update(frameMs, simStepped);
  controls.update();
  effects.render();
  requestAnimationFrame(animate);
}

animate();

window.koke = { scene, camera, simulation, ui, diagnostics, mossRenderer, spores, renderer, controls, effects, setViewPreset, captureSnapshot };
