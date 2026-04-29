import { createScene, directionFromAngles, handleResize } from "./scene.js";
import { analyzeSurface, GrowthSimulation, defaultEnvironment, mossSpeciesCatalog } from "./simulation.js";
import { createMossRenderer } from "./renderer.js";
import { createUI } from "./ui.js";
import { createDiagnostics } from "./debug.js";

const canvas = document.getElementById("viewport");
const viewportWrap = document.getElementById("viewportWrap");
const brushPreview = document.getElementById("brushPreview");
const snapshotThumb = document.getElementById("snapshotThumb");
const snapshotTitle = document.getElementById("snapshotTitle");
const snapshotMeta = document.getElementById("snapshotMeta");

const { scene, camera, renderer, controls, lights, meshGeometry, THREE } = createScene(canvas);

const initialLightAzimuth = 18;
const initialLightElevation = 54;
const lightDir = directionFromAngles(initialLightAzimuth, initialLightElevation);
lights.sun.position.copy(lightDir.clone().multiplyScalar(8));

const surface = analyzeSurface(meshGeometry, lightDir);
const simulation = new GrowthSimulation(surface, {
  environment: defaultEnvironment,
  speciesCatalog: mossSpeciesCatalog,
  lightDirection: { x: lightDir.x, y: lightDir.y, z: lightDir.z },
});

const speciesCatalog = simulation.getSpeciesCatalog();
const mossRenderer = createMossRenderer(THREE, scene, meshGeometry, {
  speciesPalette: speciesCatalog.map((species) => species.color),
  speciesProfiles: speciesCatalog,
});
mossRenderer.setCoverage(
  simulation.fillRawDensityBuffer(),
  simulation.fillRawSpeciesBuffer(),
  simulation.fillRawMassBuffer()
);
mossRenderer.updateClumps(surface.cells, surface.triangles);

let diagnostics;
const ui = createUI(
  {
    playing: true,
    moisture: defaultEnvironment.moisture,
    slopeBias: defaultEnvironment.slopeBias,
    growthRate: defaultEnvironment.growthRate,
    decayRate: defaultEnvironment.decayRate,
    diffusionRate: defaultEnvironment.diffusionRate,
    colonization: defaultEnvironment.colonization,
    gravityCreep: defaultEnvironment.gravityCreep,
    tickEveryFrames: defaultEnvironment.tickEveryFrames,
    batchRatio: defaultEnvironment.batchRatio,
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
      simulation.setEnvironment({ [key]: value });
      diagnostics?.pushLog(`Performance changed: ${key}=${value}`);
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
      ui.setUtilityTab("snapshot");
    },
    onExportPng() {
      captureSnapshot(true);
      ui.setUtilityTab("snapshot");
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
});

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

  const painted = simulation.paintAt(hits[0].point, {
    radius: ui.state.paintRadius,
    strength: ui.state.paintStrength,
    speciesId: ui.state.paintSpeciesId,
    erase: ui.state.paintErase,
  });

  if (painted > 0) {
    const now = performance.now();
    if (now - lastPaintLogAt > 180) {
      diagnostics?.pushLog(
        `${ui.state.paintErase ? "Erase" : "Paint"} stroke: ${painted} cells @ r=${ui.state.paintRadius.toFixed(2)}`
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
  const target = controls.target.clone();
  const radius = camera.position.distanceTo(target);
  const y = target.y;
  const presets = {
    iso: new THREE.Vector3(radius * 0.92, y + radius * 0.7, radius * 0.92),
    front: new THREE.Vector3(target.x, y, target.z + radius * 1.1),
    top: new THREE.Vector3(target.x, y + radius * 1.25, target.z + 0.001),
    left: new THREE.Vector3(target.x - radius * 1.1, y, target.z),
  };
  const next = presets[preset] || presets.iso;
  camera.position.copy(next);
  camera.lookAt(target);
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

window.addEventListener("resize", () => handleResize(renderer, camera, canvas));
handleResize(renderer, camera, canvas);

let lastFrameTime = performance.now();
function animate() {
  const now = performance.now();
  const frameMs = now - lastFrameTime;
  lastFrameTime = now;

  const simStepped = simulation.updateFrame();

  if (simulation.dirty) {
    mossRenderer.setCoverage(
      simulation.fillRawDensityBuffer(),
      simulation.fillRawSpeciesBuffer(),
      simulation.fillRawMassBuffer()
    );
    mossRenderer.updateClumps(surface.cells, surface.triangles);
  }

  diagnostics.update(frameMs, simStepped);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.koke = { scene, camera, simulation, ui, diagnostics };
