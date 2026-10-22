const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function summarize(values) {
  return {
    medianMs: Number(percentile(values, 0.5).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    totalMs: Number(values.reduce((sum, value) => sum + value, 0).toFixed(2)),
    samples: values.length,
  };
}

function change(id, value, event = 'change') {
  const input = document.getElementById(id);
  input.value = String(value);
  input.dispatchEvent(new Event(event, { bubbles: true }));
}

function heapSize() {
  return performance.memory ? performance.memory.usedJSHeapSize : null;
}

function makeNearLimitGlb() {
  const columns = 80, rows = 60, positions = [], indices = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns, v = row / rows;
      const x = (u - 0.5) * 8, z = (v - 0.5) * 6;
      const y = Math.sin(x * 1.35) * 0.55 + Math.cos(z * 1.7) * 0.3 + Math.sin((x + z) * 2.8) * 0.16;
      positions.push(x, y, z);
    }
  }
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const aperture = column % 16 >= 6 && column % 16 <= 8 && row % 12 >= 4 && row % 12 <= 6;
    if (aperture) continue;
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const islandCount = 100;
  for (let island = 0; island < islandCount; island += 1) {
    const x = -3.65 + (island % 10) * 0.8, z = -2.65 + Math.floor(island / 10) * 0.58;
    const y = 1.35 + Math.sin(island * 1.7) * 0.18, size = 0.12, base = positions.length / 3;
    positions.push(x - size, y, z - size, x + size, y, z - size, x - size, y, z + size, x + size, y, z + size);
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const positionArray = new Float32Array(positions), indexArray = new Uint32Array(indices);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positionArray.length; index += 3) for (let axis = 0; axis < 3; axis += 1) {
    min[axis] = Math.min(min[axis], positionArray[index + axis]); max[axis] = Math.max(max[axis], positionArray[index + axis]);
  }
  const descriptor = {
    asset: { version: '2.0', generator: 'Koke deterministic graph profile' },
    buffers: [{ byteLength: positionArray.byteLength + indexArray.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionArray.byteLength, target: 34962 },
      { buffer: 0, byteOffset: positionArray.byteLength, byteLength: indexArray.byteLength, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positionArray.length / 3, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5125, count: indexArray.length, type: 'SCALAR', min: [0], max: [positionArray.length / 3 - 1] },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }],
    nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0,
  };
  const encoder = new TextEncoder(), json = encoder.encode(JSON.stringify(descriptor));
  const jsonLength = (json.length + 3) & ~3, binaryLength = positionArray.byteLength + indexArray.byteLength;
  const total = 12 + 8 + jsonLength + 8 + binaryLength, buffer = new ArrayBuffer(total), view = new DataView(buffer), bytes = new Uint8Array(buffer);
  let offset = 0;
  view.setUint32(offset, 0x46546c67, true); view.setUint32(offset + 4, 2, true); view.setUint32(offset + 8, total, true); offset = 12;
  view.setUint32(offset, jsonLength, true); view.setUint32(offset + 4, 0x4e4f534a, true); offset += 8;
  bytes.fill(0x20, offset, offset + jsonLength); bytes.set(json, offset); offset += jsonLength;
  view.setUint32(offset, binaryLength, true); view.setUint32(offset + 4, 0x004e4942, true); offset += 8;
  bytes.set(new Uint8Array(positionArray.buffer), offset); bytes.set(new Uint8Array(indexArray.buffer), offset + positionArray.byteLength);
  return {
    file: new File([buffer], 'profile-folded-porous-disconnected.glb', { type: 'model/gltf-binary' }),
    expected: { triangles: indexArray.length / 3, sourceVertices: positionArray.length / 3, disconnectedIslands: islandCount },
  };
}

async function sampleFrames(k, view, representation, warmup = 12, count = 45) {
  change('representationInput', representation);
  k.setViewPreset(view);
  k.simulation.setRunning(true);
  for (let index = 0; index < warmup; index += 1) await nextFrame();
  const intervals = [];
  let previous = await nextFrame();
  for (let index = 0; index < count; index += 1) {
    const now = await nextFrame(); intervals.push(now - previous); previous = now;
  }
  k.simulation.setRunning(false);
  return { view, representation, ...summarize(intervals), ...k.mossRenderer.getStats(), gpu: { ...k.renderer.info.render } };
}

export async function measureGraphPerformance() {
  const k = window.koke;
  if (!k) throw new Error('KOKE is not ready');
  const gl = k.renderer.getContext(), debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  k.simulation.setRunning(false); k.effects.setEnabled(false); k.renderer.setPixelRatio(1); k.renderer.setSize(1920, 1080, false);
  k.camera.aspect = 1920 / 1080; k.camera.updateProjectionMatrix(); k.effects.resize(1920, 1080);
  change('representationInput', 'surface'); change('detailInput', 'low'); change('mossDensityInput', 0.5, 'input');
  const fixture = makeNearLimitGlb(), memoryBefore = heapSize(), previousRuntime = k.activeRuntime;
  const transfer = new DataTransfer(); transfer.items.add(fixture.file);
  const input = document.getElementById('surfaceFileInput'); Object.defineProperty(input, 'files', { value: transfer.files, configurable: true });
  const importStart = performance.now(); input.dispatchEvent(new Event('change', { bubbles: true }));
  const deadline = importStart + 30000;
  while ((k.activeRuntime === previousRuntime || k.activeRuntime.type !== 'graph') && performance.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  if (k.activeRuntime === previousRuntime) throw new Error('Near-limit GLB import timed out');
  const importMs = performance.now() - importStart, memoryAfterLow = heapSize(), low = k.mossRenderer.getStats();

  change('detailInput', 'high');
  const expansionStart = performance.now(); change('representationInput', 'cards');
  const interactionMs = performance.now() - expansionStart;
  while (k.mossRenderer.getStats().expanding && performance.now() < expansionStart + 30000) await nextFrame();
  const highExpansionMs = performance.now() - expansionStart, memoryAfterHigh = heapSize(), high = k.mossRenderer.getStats();

  const rendering = [];
  rendering.push(await sampleFrames(k, 'iso', 'cards'));
  rendering.push(await sampleFrames(k, 'macro', 'shoots'));
  rendering.push(await sampleFrames(k, 'iso', 'shoots'));

  const simulation = k.simulation, onStep = simulation.onStep, simulationTimes = [];
  simulation.onStep = null;
  for (let index = 0; index < 30; index += 1) { const start = performance.now(); simulation.stepBatch(); simulationTimes.push(performance.now() - start); }
  simulation.onStep = onStep;

  const spores = k.spores; spores.reset();
  for (let index = 0; index < spores.particles.length; index += 1) spores.release((index * 7919) % simulation.cellCount);
  const sporeTimes = [];
  for (let index = 0; index < 40; index += 1) { const start = performance.now(); spores.step(0.05); sporeTimes.push(performance.now() - start); }

  const colliderStart = performance.now(); let collisionHits = 0;
  for (let index = 0; index < 5000; index += 1) {
    const face = (index * 7919) % simulation.cellCount, base = face * 3, center = simulation.graph.centroids, normal = simulation.graph.normals;
    const from = { x: center[base] + normal[base] * 0.2, y: center[base + 1] + normal[base + 1] * 0.2, z: center[base + 2] + normal[base + 2] * 0.2 };
    const to = { x: center[base] - normal[base] * 0.02, y: center[base + 1] - normal[base + 1] * 0.02, z: center[base + 2] - normal[base + 2] * 0.02 };
    if (spores.collider.castSegment(from, to)) collisionHits += 1;
  }
  const collisionMs = performance.now() - colliderStart;
  const topology = k.activeRuntime.source.topology;
  return {
    capturedAt: new Date().toISOString(), browser: navigator.userAgent,
    gpu: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unavailable', drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    fixture: { ...fixture.expected, ...topology },
    import: { ms: Number(importMs.toFixed(2)), low, heapBefore: memoryBefore, heapAfterLow: memoryAfterLow, heapDelta: memoryBefore === null ? null : memoryAfterLow - memoryBefore },
    expansion: { interactionMs: Number(interactionMs.toFixed(2)), totalMs: Number(highExpansionMs.toFixed(2)), high,
      heapAfterHigh: memoryAfterHigh, heapDelta: memoryAfterLow === null ? null : memoryAfterHigh - memoryAfterLow },
    rendering,
    simulation: summarize(simulationTimes),
    spores: { ...summarize(sporeTimes), ...spores.getStats() },
    collision: { casts: 5000, hits: collisionHits, totalMs: Number(collisionMs.toFixed(2)), averageMs: Number((collisionMs / 5000).toFixed(5)) },
    programsRunnable: k.renderer.info.programs.every((program) => program.diagnostics?.runnable !== false),
  };
}
