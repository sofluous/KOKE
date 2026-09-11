import { createScene, createSurfaceGeometry, directionFromAngles, handleResize } from "./scene.js";
import { mossSpeciesCatalog } from "./simulation.js";
import { sampleRock, surfaceCatalog } from './substrate.js';
import { SporeSimulation } from './spores.js';
import { createViewEffects } from './view-effects.js';
import { FieldSimulation, defaultFieldEnvironment } from "./field-sim.js";
import { createFieldRenderer } from "./field-renderer.js";
import { createUI } from "./ui.js";
import { createDiagnostics } from "./debug.js";

const canvas = document.getElementById("viewport");
const viewportWrap = document.getElementById("viewportWrap");
const brushPreview = document.getElementById("brushPreview");
const snapshotThumb = document.getElementById("snapshotThumb");
const snapshotTitle = document.getElementById("snapshotTitle");
const snapshotMeta = document.getElementById("snapshotMeta");

const { scene, camera, renderer, controls, lights, meshGeometry, THREE } = createScene(canvas);
const effects = createViewEffects(renderer, scene, camera, controls);

const initialLightAzimuth = 18;
const initialLightElevation = 54;
const lightDir = directionFromAngles(initialLightAzimuth, initialLightElevation);
lights.sun.position.copy(lightDir.clone().multiplyScalar(8));

const surface = { sampleSurface: sampleRock };
const simulation = new FieldSimulation(surface, {
  environment: defaultFieldEnvironment,
  speciesCatalog: mossSpeciesCatalog,
  lightDirection: { x: lightDir.x, y: lightDir.y, z: lightDir.z },
  mapSize: 128,
});

const speciesCatalog = simulation.getSpeciesCatalog();
const mossRenderer = createFieldRenderer(THREE, scene, meshGeometry, {
  speciesPalette: speciesCatalog.map((species) => species.color),
  coverageMapSize: simulation.mapSize,
  sampleSurface: sampleRock,
});
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
    detail: 'high',
    surface: 'rock',
    surfaceDetail: 'high',
    representation: 'shoots',
    mossDensity: 1,
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
    lightAzimuth: initialLightAzimuth,
    lightElevation: initialLightElevation,
    wireframe: false,
    paintEnabled: false,
    paintRadius: 0.34,
    paintStrength: 0.72,
    paintSpeciesId: 0,
    paintErase: false,
    speciesCatalog,
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
      simulation.reset(mode);
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
    onSurfaceDetail(detail) { applySurface(ui.state.surface,detail); },
    onAppearance(key,value) {
      if(key==='representation')mossRenderer.setRepresentation(value);
      else if(key==='density')mossRenderer.setDensity(value);
      else mossRenderer.setAppearance({[key]:value});
      diagnostics?.pushLog(`Appearance changed: ${key}=${value}.`);
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
    onExportPng() {
      captureSnapshot(true);
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
diagnostics.pushLog("Simulation ready. Press Play to begin.");

function applySurface(key,detail) {
  const definition=surfaceCatalog[key]||surfaceCatalog.rock;
  simulation.setRunning(false);ui.setPlaying(false);
  simulation.setSurface(definition.sample);
  spores.reset();
  mossRenderer.setSurface(definition.sample,createSurfaceGeometry(definition.sample,detail,key==='icosahedron'));
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
function animate() {
  const now = performance.now();
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
