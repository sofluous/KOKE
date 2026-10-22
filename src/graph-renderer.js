import { createMeshCollisionAdapter } from './mesh-collision.js';
import { createMeshRenderAnchorBuilder, createMeshRenderAnchors, MeshRenderAnchorState } from './mesh-render-anchors.js';
import { noise } from './substrate.js';
import { computeShootLodFactor } from './render-detail.js';

export const GRAPH_RENDER_COUNTS = Object.freeze({ low: 30_000, high: 60_000 });

export function computeGraphInstanceCount(capacity, density = 1) {
  if (!Number.isInteger(capacity) || capacity < 0) throw new RangeError('Render capacity must be a nonnegative integer');
  if (!Number.isFinite(density) || density < 0 || density > 1) throw new RangeError('Render density must be between zero and one');
  return Math.min(capacity, Math.round(capacity * density));
}

function geometryForMode(THREE, mode) {
  if (mode === 'clumps') return new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const positions = [];
  const triangle = (a, b, c) => positions.push(...a, ...b, ...c);
  if (mode === 'triangles') triangle([-0.38, 0, 0], [0.38, 0, 0], [0, 1, 0]);
  else if (mode === 'diamonds') {
    triangle([0, 0, 0], [-0.34, 0.48, 0], [0, 1, 0]);
    triangle([0, 0, 0], [0, 1, 0], [0.34, 0.48, 0]);
  } else if (mode === 'cards') {
    triangle([-0.3, 0, 0], [0.3, 0, 0], [-0.18, 1, 0]);
    triangle([0.3, 0, 0], [0.18, 1, 0], [-0.18, 1, 0]);
    triangle([0, 0, -0.3], [0, 0, 0.3], [0, 1, -0.18]);
    triangle([0, 0, 0.3], [0, 1, 0.18], [0, 1, -0.18]);
  } else {
    for (let stem = 0; stem < 2; stem += 1) {
      const angle = stem * 2.39996, x = Math.cos(angle) * 0.2, z = Math.sin(angle) * 0.2;
      triangle([x - 0.018, 0, z], [x + 0.018, 0, z], [x + 0.1, 0.8, z + 0.04]);
      for (let leaf = 0; leaf < 3; leaf += 1) {
        const y = (leaf + 1) * 0.18, turn = angle + leaf * 2.4, radius = 0.22 - leaf * 0.04;
        triangle([x, y - 0.06, z], [x + Math.cos(turn) * radius, y + 0.1, z + Math.sin(turn) * radius],
          [x + Math.cos(turn + 0.8) * radius * 0.45, y, z + Math.sin(turn + 0.8) * radius * 0.45]);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function attachStateAttributes(THREE, geometry, state, variations) {
  const attributes = {
    anchorDensity: new THREE.InstancedBufferAttribute(state.density, 1),
    anchorBiomass: new THREE.InstancedBufferAttribute(state.biomass, 1),
    anchorVitality: new THREE.InstancedBufferAttribute(state.vitality, 1),
    anchorStress: new THREE.InstancedBufferAttribute(state.stress, 1),
    anchorMoisture: new THREE.InstancedBufferAttribute(state.moisture, 1),
    anchorSpecies: new THREE.InstancedBufferAttribute(state.species, state.speciesCount),
    anchorVariation: new THREE.InstancedBufferAttribute(variations, 1),
  };
  for (const [name, attribute] of Object.entries(attributes)) {
    if (name !== 'anchorVariation') attribute.setUsage?.(THREE.DynamicDrawUsage);
    geometry.setAttribute(name, attribute);
  }
  return attributes;
}

const SNAPSHOT_CHANNELS = ['species', 'dormantReserves', 'vitality', 'moisture', 'biomass', 'age', 'stress', 'deadMatter'];

function createStateSnapshot(source) {
  const snapshot = {
    topology: source.topology,
    cellCount: source.cellCount,
    speciesCount: source.speciesCount,
    revision: -1,
  };
  for (const name of SNAPSHOT_CHANNELS) snapshot[name] = new source[name].constructor(source[name].length);
  return snapshot;
}

function captureStateSnapshot(source, target) {
  if (source.topology !== target.topology || source.cellCount !== target.cellCount || source.speciesCount !== target.speciesCount) {
    throw new TypeError('Simulation snapshot dimensions changed');
  }
  for (const name of SNAPSHOT_CHANNELS) target[name].set(source[name]);
  target.revision = source.revision;
  return target;
}

function markAttributeRange(attributes, start, end, speciesCount) {
  const ranges = {
    anchorDensity: [start, end - start],
    anchorBiomass: [start, end - start],
    anchorVitality: [start, end - start],
    anchorStress: [start, end - start],
    anchorMoisture: [start, end - start],
    anchorSpecies: [start * speciesCount, (end - start) * speciesCount],
  };
  for (const [name, [offset, count]] of Object.entries(ranges)) {
    const attribute = attributes[name];
    attribute.addUpdateRange?.(offset, count);
    attribute.needsUpdate = true;
  }
}

function makePlantMaterial(THREE, uniforms, depth = false) {
  const material = depth
    ? new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
attribute float anchorDensity;
attribute float anchorBiomass;
attribute float anchorVitality;
attribute float anchorStress;
attribute float anchorMoisture;
attribute vec3 anchorSpecies;
attribute float anchorVariation;
uniform float mossScale;
uniform float mossAspect;
uniform float mossOrientation;
uniform float mossColonyVariation;
uniform float mossPatchiness;
uniform float mossColorSource;
uniform float mossColorRange;
uniform float mossColorInvert;
uniform float mossTextureStrength;
uniform vec3 mossShootWidth;
uniform vec3 mossShootHeight;
varying vec3 vGraphSpecies;
varying float vGraphStress;
varying float vGraphVitality;
varying float vGraphMoisture;
varying float vGraphTip;`).replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 speciesWeights=anchorSpecies/max(0.001,anchorSpecies.x+anchorSpecies.y+anchorSpecies.z);
float threshold=0.015+anchorVariation*0.14*mossPatchiness;
float alive=smoothstep(threshold,threshold+0.22,anchorDensity)*anchorVitality;
float speciesWidth=dot(speciesWeights,mossShootWidth);
float speciesHeight=dot(speciesWeights,mossShootHeight);
float colony=mix(1.0,mix(0.72,1.32,anchorVariation),mossColonyVariation);
transformed.xz*=mossScale*mossAspect*speciesWidth*(0.55+anchorBiomass*0.65)*colony;
transformed.y*=mossScale*speciesHeight*(0.25+anchorBiomass*0.95)*(1.0-anchorStress*0.82);
transformed*=alive;
transformed.x+=(anchorVariation-0.5)*position.y*0.08*mossOrientation;
vGraphSpecies=speciesWeights;
vGraphStress=anchorStress;
vGraphVitality=anchorVitality;
vGraphMoisture=anchorMoisture;
vGraphTip=position.y;`);
    if (!depth) shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 mossRootColor;
uniform vec3 mossTipColor;
uniform vec3 mossStressColor;
uniform float mossColorSource;
uniform float mossColorRange;
uniform float mossColorInvert;
uniform float mossTextureStrength;
varying vec3 vGraphSpecies;
varying float vGraphStress;
varying float vGraphVitality;
varying float vGraphMoisture;
varying float vGraphTip;`).replace('#include <color_fragment>', `#include <color_fragment>
if(vGraphVitality<0.002) discard;
float source=dot(vGraphSpecies,vec3(0.18,0.58,0.88));
if(mossColorSource>1.5&&mossColorSource<2.5)source=vGraphVitality;
else if(mossColorSource>2.5&&mossColorSource<3.5)source=vGraphTip;
else if(mossColorSource>3.5&&mossColorSource<4.5)source=vGraphMoisture;
source=clamp((source-0.5)*mossColorRange+0.5,0.0,1.0);source=mix(source,1.0-source,mossColorInvert);
source=clamp(source+(vGraphMoisture-0.5)*mossTextureStrength*0.2,0.0,1.0);
vec3 moss=mix(mossRootColor,mossTipColor,source*0.58+vGraphTip*0.42);
moss=mix(moss,mossStressColor,clamp(vGraphStress,0.0,1.0));
diffuseColor.rgb*=moss*(0.72+vGraphMoisture*0.28);`);
  };
  material.customProgramCacheKey = () => `koke-graph-${depth ? 'depth' : 'surface'}-1`;
  return material;
}

export function createGraphRenderer(THREE, scene, meshGeometry, graph, simulation, options = {}) {
  if (!THREE || !scene?.add || !meshGeometry?.attributes?.position) throw new TypeError('Three.js, a scene and mesh geometry are required');
  if (simulation?.graph !== graph || typeof simulation.getState !== 'function') throw new TypeError('A matching graph simulation is required');
  const quality = options.initialQuality === 'high' ? 'high' : 'low';
  let currentQuality = quality;
  let density = Number.isFinite(options.initialDensity) ? options.initialDensity : 0.5;
  if (density < 0 || density > 1) throw new RangeError('Initial density must be between zero and one');
  let representation = ['surface', 'triangles', 'diamonds', 'cards', 'clumps', 'shoots'].includes(options.initialRepresentation)
    ? options.initialRepresentation : 'shoots';
  const maxCapacity = options.capacity ?? GRAPH_RENDER_COUNTS.high;
  if (!Number.isInteger(maxCapacity) || maxCapacity < 1 || maxCapacity > GRAPH_RENDER_COUNTS.high) throw new RangeError('Graph render capacity is invalid');
  const lowCapacity = options.lowCapacity ?? (options.capacity === undefined ? Math.min(GRAPH_RENDER_COUNTS.low, maxCapacity) : maxCapacity);
  if (!Number.isInteger(lowCapacity) || lowCapacity < 1 || lowCapacity > maxCapacity) throw new RangeError('Graph Low render capacity is invalid');
  const renderGeometry = meshGeometry.index && meshGeometry.toNonIndexed ? meshGeometry.toNonIndexed() : meshGeometry.clone();
  const surfaceColors = new Float32Array(renderGeometry.attributes.position.count * 3);
  const surfaceColorAttribute = new THREE.BufferAttribute(surfaceColors, 3);
  renderGeometry.setAttribute('color', surfaceColorAttribute);
  const surfaceMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, vertexColors: true });
  const surfaceMesh = new THREE.Mesh(renderGeometry, surfaceMaterial);
  surfaceMesh.castShadow = true; surfaceMesh.receiveShadow = true;
  const collision = createMeshCollisionAdapter(surfaceMesh, graph);
  const group = new THREE.Group(); group.add(surfaceMesh); scene.add(group);

  const profiles = options.speciesProfiles || simulation.getSpeciesCatalog().map((species) => species.renderProfile);
  const vector = (key, fallback) => new THREE.Vector3(...[0, 1, 2].map((index) => Number(profiles[index]?.[key]) || fallback));
  const uniforms = {
    mossRootColor: { value: new THREE.Color(options.rootColor || '#24451f') },
    mossTipColor: { value: new THREE.Color(options.tipColor || '#a5c950') },
    mossStressColor: { value: new THREE.Color(options.stressColor || '#4b2814') },
    mossScale: { value: 1 }, mossAspect: { value: 1 }, mossOrientation: { value: 1 },
    mossColonyVariation: { value: 0.85 }, mossPatchiness: { value: 0.7 },
    mossColorSource: { value: 1 }, mossColorRange: { value: 1 }, mossColorInvert: { value: 0 }, mossTextureStrength: { value: 0.22 },
    mossShootWidth: { value: vector('shootWidth', 1) }, mossShootHeight: { value: vector('shootHeight', 1) },
  };
  let wireframe = false;
  function positionPlantRange(nextPlants, nextAnchors, start, end) {
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3();
    for (let anchor = start; anchor < end; anchor += 1) {
      const offset = anchor * 3;
      dummy.position.set(nextAnchors.positions[offset], nextAnchors.positions[offset + 1], nextAnchors.positions[offset + 2]);
      normal.set(nextAnchors.normals[offset], nextAnchors.normals[offset + 1], nextAnchors.normals[offset + 2]);
      dummy.position.addScaledVector(normal, 0.004);
      dummy.quaternion.setFromUnitVectors(up, normal);
      dummy.rotateY(nextAnchors.variations[anchor] * Math.PI * 2);
      const radius = 0.055 + nextAnchors.variations[anchor] * 0.055;
      dummy.scale.set(radius, radius, radius);
      dummy.updateMatrix(); nextPlants.setMatrixAt(anchor, dummy.matrix);
    }
  }
  function createPlantMesh(capacity, nextGeometry) {
    const material = makePlantMaterial(THREE, uniforms); material.wireframe = wireframe;
    const nextPlants = new THREE.InstancedMesh(nextGeometry, material, capacity);
    nextPlants.customDepthMaterial = makePlantMaterial(THREE, uniforms, true);
    nextPlants.castShadow = true; nextPlants.receiveShadow = true; nextPlants.frustumCulled = false;
    return nextPlants;
  }
  function buildPlants(capacity) {
    const nextAnchors = createMeshRenderAnchors(graph, { count: capacity, seed: options.seed ?? 0 });
    const nextState = new MeshRenderAnchorState(nextAnchors, simulation.speciesCount);
    nextState.update(simulation.getState());
    const nextGeometry = geometryForMode(THREE, representation === 'surface' ? 'triangles' : representation);
    const nextAttributes = attachStateAttributes(THREE, nextGeometry, nextState, nextAnchors.variations);
    const nextPlants = createPlantMesh(capacity, nextGeometry);
    positionPlantRange(nextPlants, nextAnchors, 0, capacity);
    nextPlants.instanceMatrix.needsUpdate = true;
    return { anchors: nextAnchors, anchorState: nextState, stateAttributes: nextAttributes, plants: nextPlants };
  }
  let plantSet = buildPlants(lowCapacity);
  let { anchors, anchorState, stateAttributes, plants } = plantSet;
  group.add(plants);
  const particlePositions = new Float32Array(1024 * 3);
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositionAttribute=new THREE.BufferAttribute(particlePositions,3);particlePositionAttribute.setUsage?.(THREE.DynamicDrawUsage);
  particleGeometry.setAttribute('position',particlePositionAttribute);
  particleGeometry.setDrawRange(0, 0);
  const particleMaterial = new THREE.PointsMaterial({ color: '#e7efad', size: 0.022, transparent: true, opacity: 0.8, depthWrite: false });
  const particles = new THREE.Points(particleGeometry, particleMaterial); particles.frustumCulled = false; group.add(particles);
  let lastSporeRevision = -1, adaptiveDetail = options.adaptiveDetail !== false, viewDistance = 4;
  let lodFactor = adaptiveDetail ? computeShootLodFactor(viewDistance) : 1;
  const expansionChunkSize = options.expansionChunkSize ?? 4000;
  if (!Number.isInteger(expansionChunkSize) || expansionChunkSize < 1) throw new RangeError('Expansion chunk size must be positive');
  const lifecycleChunkSize = options.lifecycleChunkSize ?? 8_000;
  if (!Number.isInteger(lifecycleChunkSize) || lifecycleChunkSize < 1) throw new RangeError('Lifecycle chunk size must be positive');
  const scheduleWork = options.scheduleWork || ((callback) => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : setTimeout(callback, 0));
  let expansion = null, disposed = false, lastExpansionMs = 0, maxExpansionChunkMs = 0;
  const lifecycleSnapshot = createStateSnapshot(simulation.getState());
  let lifecycleSync = null, queuedLifecycleRevision = -1, maxLifecycleChunkMs = 0, coalescedLifecycleUpdates = 0;

  const palette = (options.speciesPalette || simulation.getSpeciesCatalog().map((species) => species.color)).map((color) => new THREE.Color(color));
  const baseColor = new THREE.Color(options.surfaceBaseColor || '#252c2e');
  const accentColor = new THREE.Color(options.surfaceAccentColor || '#586063');
  let surfaceTexture='cracked',surfaceTextureScale=14,surfaceTextureStrength=0.7;
  const tempColor = new THREE.Color(),stoneColor=new THREE.Color();
  let surfaceRevision = -1;
  function updateSurfaceColors(state) {
    for (let triangle = 0; triangle < graph.triangleCount; triangle += 1) {
      const source = triangle * simulation.speciesCount;
      let total = 0, red = 0, green = 0, blue = 0;
      for (let species = 0; species < simulation.speciesCount; species += 1) {
        const weight = state.species[source + species]; total += weight;
        red += palette[species].r * weight; green += palette[species].g * weight; blue += palette[species].b * weight;
      }
      const center=triangle*3,patternNoise=noise(graph.centroids[center]*surfaceTextureScale,graph.centroids[center+1]*surfaceTextureScale,graph.centroids[center+2]*surfaceTextureScale);
      let pattern=surfaceTexture==='smooth'?0.18:surfaceTexture==='layered'?0.5+0.5*Math.sin((graph.centroids[center+1]+patternNoise*0.16)*surfaceTextureScale):surfaceTexture==='cracked'?(patternNoise>0.5?1:0):surfaceTexture==='speckled'?(patternNoise>0.72?1:0):patternNoise;
      const stone=stoneColor.copy(baseColor).lerp(accentColor,Math.max(0,Math.min(1,pattern*surfaceTextureStrength)));
      if (total > 1e-6) tempColor.setRGB(red / total, green / total, blue / total); else tempColor.copy(stone);
      tempColor.lerp(uniforms.mossStressColor.value, state.stress[triangle] * 0.8);
      const coverage = Math.max(0, Math.min(1, total));
      for (let corner = 0; corner < 3; corner += 1) {
        const target = (triangle * 3 + corner) * 3;
        surfaceColors[target] = stone.r + (tempColor.r - stone.r) * coverage;
        surfaceColors[target + 1] = stone.g + (tempColor.g - stone.g) * coverage;
        surfaceColors[target + 2] = stone.b + (tempColor.b - stone.b) * coverage;
      }
    }
    surfaceColorAttribute.needsUpdate = true;
    surfaceRevision = state.revision;
  }

  function startLifecycleSync(state) {
    const snapshot = captureStateSnapshot(state, lifecycleSnapshot);
    const record = { snapshot, processed: 0, progress: 0 };
    lifecycleSync = record;
    const advance = () => {
      if (disposed || lifecycleSync !== record) return;
      const startedAt = performance.now();
      const start = record.processed, end = Math.min(anchors.count, start + lifecycleChunkSize);
      anchorState.copyRange(snapshot, start, end);
      markAttributeRange(stateAttributes, start, end, simulation.speciesCount);
      record.processed = end;
      record.progress = anchors.count ? end / anchors.count : 1;
      maxLifecycleChunkMs = Math.max(maxLifecycleChunkMs, performance.now() - startedAt);
      if (end < anchors.count) { scheduleWork(advance); return; }
      anchorState.commit(snapshot);
      lifecycleSync = null;
      const queued = queuedLifecycleRevision;
      queuedLifecycleRevision = -1;
      const latest = simulation.getState();
      if (queued >= 0 && latest.revision !== anchorState.revision) startLifecycleSync(latest);
    };
    scheduleWork(advance);
  }

  function requestLifecycleSync(state) {
    if (state.revision === anchorState.revision) return false;
    if (lifecycleSync) {
      if (state.revision === lifecycleSync.snapshot.revision || state.revision === queuedLifecycleRevision) return false;
      if (queuedLifecycleRevision >= 0) coalescedLifecycleUpdates += 1;
      queuedLifecycleRevision = state.revision;
      return true;
    }
    startLifecycleSync(state);
    return true;
  }

  function syncVisibility() {
    plants.visible = representation !== 'surface';
    const qualityLimit = currentQuality === 'low' ? lowCapacity : maxCapacity;
    const detailFactor = representation === 'shoots' ? lodFactor : 1;
    plants.count = Math.min(anchors.count, Math.round(computeGraphInstanceCount(qualityLimit, density) * detailFactor));
  }
  function update(spores = null) {
    const state = simulation.getState();
    const stateChanged = requestLifecycleSync(state);
    if (state.revision !== surfaceRevision) updateSurfaceColors(state);
    let sporesChanged = false;
    if (spores && spores.revision !== lastSporeRevision) {
      lastSporeRevision = spores.revision; let count = 0;
      for (const particle of spores.particles) if (particle.state > 0 && count < 1024) {
        particlePositions.set([particle.x, particle.y, particle.z], count * 3); count += 1;
      }
      particleGeometry.setDrawRange(0, count); particleGeometry.attributes.position.needsUpdate = true; sporesChanged = true;
    }
    return stateChanged || sporesChanged;
  }
  function disposePlantMesh(target) {
    target.geometry.dispose?.(); target.material.dispose?.(); target.customDepthMaterial.dispose?.();
  }
  function ensurePlantCapacity(capacity) {
    if (anchors.count >= capacity || expansion) return false;
    const startedAt = performance.now(), builder = createMeshRenderAnchorBuilder(graph, { count: capacity, seed: options.seed ?? 0 });
    const pendingState = new MeshRenderAnchorState(builder.anchors, simulation.speciesCount);
    const pendingPlants = createPlantMesh(capacity, geometryForMode(THREE, 'triangles'));
    let resolveExpansion;
    const record = { builder, plants: pendingPlants, state: pendingState, progress: 0, phase: 'anchors',
      promise: new Promise((resolve) => { resolveExpansion = resolve; }), resolve: resolveExpansion };
    expansion = record;
    const advance = () => {
      if (expansion !== record) { record.resolve(false); return; }
      if (disposed) { disposePlantMesh(pendingPlants); record.resolve(false); return; }
      const chunkStartedAt = performance.now();
      if (record.phase === 'anchors') {
        const start = builder.processed;
        builder.advance(expansionChunkSize);
        positionPlantRange(pendingPlants, builder.anchors, start, builder.processed);
        record.progress = builder.progress * 0.5;
        maxExpansionChunkMs = Math.max(maxExpansionChunkMs, performance.now() - chunkStartedAt);
        if (!builder.done) { scheduleWork(advance); return; }
        pendingPlants.instanceMatrix.needsUpdate = true;
        const previousPlaceholder = pendingPlants.geometry;
        const finalGeometry = geometryForMode(THREE, representation === 'surface' ? 'triangles' : representation);
        record.attributes = attachStateAttributes(THREE, finalGeometry, pendingState, builder.anchors.variations);
        pendingPlants.geometry = finalGeometry; previousPlaceholder.dispose?.();
        const currentState = simulation.getState();
        record.snapshot = captureStateSnapshot(currentState, createStateSnapshot(currentState));
        record.processed = 0; record.phase = 'lifecycle';
        maxExpansionChunkMs = Math.max(maxExpansionChunkMs, performance.now() - chunkStartedAt);
        scheduleWork(advance); return;
      }
      const start = record.processed, end = Math.min(capacity, start + lifecycleChunkSize);
      pendingState.copyRange(record.snapshot, start, end);
      record.processed = end; record.progress = 0.5 + (capacity ? end / capacity : 1) * 0.5;
      maxExpansionChunkMs = Math.max(maxExpansionChunkMs, performance.now() - chunkStartedAt);
      if (end < capacity) { scheduleWork(advance); return; }
      pendingState.commit(record.snapshot);
      const previous = plants;
      plantSet = { anchors: builder.anchors, anchorState: pendingState, stateAttributes: record.attributes, plants: pendingPlants };
      ({ anchors, anchorState, stateAttributes, plants } = plantSet);
      group.remove(previous); group.add(plants); disposePlantMesh(previous);
      lifecycleSync = null; queuedLifecycleRevision = -1;
      expansion = null; update(); syncVisibility();
      maxExpansionChunkMs = Math.max(maxExpansionChunkMs, performance.now() - chunkStartedAt);
      lastExpansionMs = performance.now() - startedAt; record.resolve(true);
    };
    scheduleWork(advance);
    return true;
  }
  function setRepresentation(next) {
    if (!['surface', 'triangles', 'diamonds', 'cards', 'clumps', 'shoots'].includes(next)) throw new RangeError('Unknown graph moss representation');
    const changed = next !== representation;
    representation = next;
    if (next !== 'surface' && currentQuality === 'high') ensurePlantCapacity(maxCapacity);
    if (next !== 'surface' && changed) {
      const replacement = geometryForMode(THREE, next);
      stateAttributes = attachStateAttributes(THREE, replacement, anchorState, anchors.variations);
      const previous = plants.geometry; plants.geometry = replacement; if (previous !== replacement) previous.dispose();
    }
    syncVisibility();
  }
  function setQuality(next) {
    if (!['low', 'high'].includes(next)) throw new RangeError('Unknown graph render quality');
    currentQuality = next;
    if (next === 'high' && representation !== 'surface') ensurePlantCapacity(maxCapacity);
    syncVisibility();
  }
  function setDensity(next) { computeGraphInstanceCount(1, next); density = next; syncVisibility(); }
  function setAppearance(next = {}) {
    if (next.scale !== undefined) {
      if (!Number.isFinite(next.scale) || next.scale <= 0) throw new RangeError('Moss scale must be positive');
      uniforms.mossScale.value = next.scale;
    }
    if (next.aspect !== undefined) {
      if (!Number.isFinite(next.aspect) || next.aspect <= 0) throw new RangeError('Moss aspect must be positive');
      uniforms.mossAspect.value = next.aspect;
    }
    if(next.orientation!==undefined)uniforms.mossOrientation.value=Number(next.orientation);
    if(next.colonyVariation!==undefined)uniforms.mossColonyVariation.value=Number(next.colonyVariation);
    if(next.patchiness!==undefined)uniforms.mossPatchiness.value=Number(next.patchiness);
    if(next.colorSource){const sources={uniform:0,species:1,health:2,thickness:3,moisture:4,height:5};if(!(next.colorSource in sources))throw new RangeError('Unknown color source');uniforms.mossColorSource.value=sources[next.colorSource];}
    if(next.colorRange!==undefined)uniforms.mossColorRange.value=Number(next.colorRange);
    if(next.invert!==undefined)uniforms.mossColorInvert.value=next.invert?1:0;
    if(next.textureStrength!==undefined)uniforms.mossTextureStrength.value=Number(next.textureStrength);
    if (next.rootColor) uniforms.mossRootColor.value.set(next.rootColor);
    if (next.tipColor) uniforms.mossTipColor.value.set(next.tipColor);
    if (next.stressColor) uniforms.mossStressColor.value.set(next.stressColor);
  }
  function setSurfaceAppearance(next = {}) {
    if (next.baseColor) { baseColor.set(next.baseColor); if (anchorState.revision >= 0) updateSurfaceColors(simulation.getState()); }
    if (next.accentColor) accentColor.set(next.accentColor);
    if (next.texture) { if(!['smooth','grain','layered','cracked','speckled'].includes(next.texture))throw new RangeError('Unknown surface texture');surfaceTexture=next.texture; }
    if (next.textureScale !== undefined) surfaceTextureScale=Number(next.textureScale);
    if (next.textureStrength !== undefined) surfaceTextureStrength=Number(next.textureStrength);
    if (next.roughness !== undefined) surfaceMaterial.roughness = Number(next.roughness);
    if(anchorState.revision>=0)updateSurfaceColors(simulation.getState());
  }
  function setAdaptiveDetail(value) {
    adaptiveDetail = Boolean(value); lodFactor = adaptiveDetail ? computeShootLodFactor(viewDistance) : 1; syncVisibility();
  }
  function setViewDistance(value) {
    if (!Number.isFinite(value) || value < 0) return;
    viewDistance = value;
    const next = adaptiveDetail ? computeShootLodFactor(value) : 1;
    if (Math.abs(next - lodFactor) < 0.002) return;
    lodFactor = next; syncVisibility();
  }
  function setDew() {}
  function setWireframe(value) { wireframe = Boolean(value); surfaceMaterial.wireframe = wireframe; plants.material.wireframe = wireframe; if(expansion)expansion.plants.material.wireframe=wireframe; }
  function getStats() {
    return { type: 'graph', anchors: anchors.count, instances: plants.count, clumpCount: plants.visible ? plants.count : 0,
      maxClumps: anchors.count, tuftCount: plants.visible ? plants.count : 0, tuftCapacity: anchors.count, maxCapacity, quality: currentQuality, density,
      representation, revision: anchorState.revision, visible: plants.visible, triangles: graph.triangleCount,
      adaptiveDetail, lodFactor: Number(lodFactor.toFixed(3)), viewDistance: Number(viewDistance.toFixed(2)),
      expanding: Boolean(expansion), expansionProgress: Number((expansion?.progress ?? 1).toFixed(3)),
      lastExpansionMs: Number(lastExpansionMs.toFixed(2)), maxExpansionChunkMs: Number(maxExpansionChunkMs.toFixed(2)),
      lifecycleSyncing: Boolean(lifecycleSync), lifecycleProgress: Number((lifecycleSync?.progress ?? 1).toFixed(3)),
      lifecycleTargetRevision: lifecycleSync?.snapshot.revision ?? anchorState.revision,
      lifecycleLag: Math.max(0, simulation.getState().revision - anchorState.revision),
      maxLifecycleChunkMs: Number(maxLifecycleChunkMs.toFixed(2)), coalescedLifecycleUpdates };
  }
  function dispose() {
    disposed = true; lifecycleSync = null; if(expansion){const pending=expansion;expansion=null;disposePlantMesh(pending.plants);pending.resolve(false);}
    scene.remove(group); disposePlantMesh(plants); renderGeometry.dispose?.(); surfaceMaterial.dispose?.();
    particleGeometry.dispose?.(); particleMaterial.dispose?.();
  }
  syncVisibility(); update();
  return { group, mesh: surfaceMesh, get plants(){return plants;}, particles, get anchors(){return anchors;}, get anchorState(){return anchorState;}, collision, update, setRepresentation,
    setQuality, setDensity, setAppearance, setSurfaceAppearance, setAdaptiveDetail, setViewDistance, setDew, setWireframe,
    whenHighReady(){return expansion?.promise||Promise.resolve(anchors.count>=maxCapacity);}, getStats, dispose };
}
