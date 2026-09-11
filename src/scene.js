import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { sampleRock, uvAt } from './substrate.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#171e23");
  scene.fog = new THREE.Fog('#171e23', 15, 35);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.userData.dewEnvironment = pmrem.fromScene(environment).texture;
  environment.dispose(); pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(42, initialWidth / initialHeight, 0.05, 80);
  camera.position.set(5.4, 3.7, 6.3);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0.15, 0);
  controls.minDistance = 2.6;
  controls.maxDistance = 16;

  const ambient = new THREE.HemisphereLight("#c1dce9", '#252d20', 1.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight("#ffefcf", 2.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 0.5, far: 20 });
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.025;
  sun.position.copy(directionFromAngles(DEFAULT_LIGHT_AZIMUTH_DEG, DEFAULT_LIGHT_ELEVATION_DEG).multiplyScalar(8));
  scene.add(sun);

  const rim = new THREE.DirectionalLight('#b7d9e8', 1.8);
  rim.position.set(-4, 3, -3); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: '#20282b', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.05; floor.receiveShadow = true; scene.add(floor);

  const geometry = createSurfaceGeometry(sampleRock);

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

export function createSurfaceGeometry(sampleSurface, detail = 'high', faceted = false) {
  const [widthSegments,heightSegments]=detail==='low'?[48,24]:[128,64];
  const geometry = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const uv = uvAt({ x: position.getX(i), y: position.getY(i), z: position.getZ(i) });
    const p = sampleSurface(uv.u, uv.v);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  if(faceted){const flat=geometry.toNonIndexed();geometry.dispose();flat.computeVertexNormals();return flat;}
  geometry.computeVertexNormals();return geometry;
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
