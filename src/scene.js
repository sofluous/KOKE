import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const DEFAULT_LIGHT_ELEVATION_DEG = 54;
const DEFAULT_LIGHT_AZIMUTH_DEG = 18;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const initialWidth = Math.max(1, canvas.clientWidth || window.innerWidth);
  const initialHeight = Math.max(1, canvas.clientHeight || window.innerHeight);
  renderer.setSize(initialWidth, initialHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0f1812");

  const camera = new THREE.PerspectiveCamera(55, initialWidth / initialHeight, 0.1, 200);
  camera.position.set(6.2, 5.1, 6.8);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0.7, 0);

  const ambient = new THREE.AmbientLight("#95a889", 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight("#f5ffe8", 1.2);
  sun.position.copy(directionFromAngles(DEFAULT_LIGHT_AZIMUTH_DEG, DEFAULT_LIGHT_ELEVATION_DEG).multiplyScalar(8));
  scene.add(sun);

  const grid = new THREE.GridHelper(14, 20, "#35553e", "#24402f");
  grid.position.y = -1.55;
  scene.add(grid);

  const geometry = new THREE.IcosahedronGeometry(2.2, 6).toNonIndexed();
  geometry.computeVertexNormals();

  return {
    THREE,
    scene,
    camera,
    renderer,
    controls,
    lights: {
      ambient,
      sun,
    },
    meshGeometry: geometry,
  };
}

export function directionFromAngles(azimuthDeg, elevationDeg) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const horizontal = Math.cos(el);
  return new THREE.Vector3(Math.cos(az) * horizontal, Math.sin(el), Math.sin(az) * horizontal).normalize();
}

export function handleResize(renderer, camera, canvas) {
  const width = Math.max(1, canvas.clientWidth || window.innerWidth);
  const height = Math.max(1, canvas.clientHeight || window.innerHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
