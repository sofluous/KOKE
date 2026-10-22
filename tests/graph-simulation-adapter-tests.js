import assert from 'node:assert/strict';
import { GraphSimulationAdapter } from '../src/graph-simulation-adapter.js';
import { createMeshSurfaceGraph } from '../src/mesh-surface-graph.js';

const positions = new Float32Array([
  0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0,
  1, 0, 1, 1, 1, 1,
  0, 0, 0.04, 1, 0, 0.04, 0, 1, 0.04, 1, 1, 0.04,
]);
const indices = new Uint32Array([
  0, 1, 2, 1, 3, 2,
  1, 4, 3, 4, 5, 3,
  6, 7, 8, 7, 9, 8,
]);
const graph = createMeshSurfaceGraph(positions, { indices });

const adapter = new GraphSimulationAdapter(graph, { seed: 42, initialState: 'bare' });
let steppedDuration = 0;
adapter.onStep = (dt) => { steppedDuration += dt; };
adapter.stepBatch();
assert.ok(steppedDuration > 0, 'fixed simulation steps advance attached runtime systems');
adapter.onStep = null;
const state = adapter.getState();
assert.deepEqual(state.channels, [
  'species', 'vitality', 'moisture', 'biomass', 'age', 'stress', 'dormantReserves', 'deadMatter',
]);
assert.equal(state.cellCount, graph.triangleCount);
assert.equal(state.species.length, graph.triangleCount * 3);
assert.equal(state.dormantReserves.length, graph.triangleCount * 3);
for (const channel of ['vitality', 'moisture', 'biomass', 'age', 'stress', 'deadMatter']) {
  assert.equal(state[channel].length, graph.triangleCount, channel);
}

const paintRevision = adapter.revision;
assert.equal(adapter.paintFromFace(0, { radius: 10, strength: 0.8, speciesId: 2 }), 4);
assert.equal(adapter.revision, paintRevision + 1);
for (let triangle = 0; triangle < 4; triangle += 1) assert.ok(adapter.species[triangle * 3 + 2] > 0);
for (let triangle = 4; triangle < 6; triangle += 1) assert.equal(adapter.species[triangle * 3 + 2], 0);
const beforeErase = adapter.species[2];
assert.ok(adapter.paintFromFace(0, { radius: 0.2, strength: 0.5, speciesId: 2, erase: true }) > 0);
assert.ok(adapter.species[2] < beforeErase);
assert.equal(adapter.getStats().paintOps, 2);
adapter.reset('bare');

// Seed one component directly to isolate lifecycle propagation from brush falloff.
adapter.species[0] = 0.8;
adapter.biomass[0] = 0.6;
for (let step = 0; step < 240; step += 1) adapter.step();
assert.ok(adapter.species[3 * 3] > 0, 'living state propagates through the folded component');
for (let triangle = 4; triangle < 6; triangle += 1) {
  assert.equal(adapter.species[triangle * 3], 0, 'living state cannot cross a disconnected gap');
  assert.equal(adapter.biomass[triangle], 0, 'biomass cannot appear on an unseeded component');
}

const beforeConversion = adapter.getState();
const biomass = beforeConversion.biomass.slice();
const ages = beforeConversion.age.slice();
assert.ok(adapter.convertSpecies(2) > 0);
for (let triangle = 0; triangle < graph.triangleCount; triangle += 1) {
  const base = triangle * 3;
  assert.equal(adapter.species[base], 0);
  assert.equal(adapter.species[base + 1], 0);
}
assert.deepEqual(adapter.biomass, biomass);
assert.deepEqual(adapter.age, ages);

const dormantOnly = new GraphSimulationAdapter(graph, { initialState: 'bare' });
dormantOnly.dormantReserves[1] = 0.25;
const dormantRevision = dormantOnly.revision;
assert.equal(dormantOnly.convertSpecies(2), 0);
assert.equal(dormantOnly.dormantReserves[2], 0.25);
assert.equal(dormantOnly.revision, dormantRevision + 1);

const dry = new GraphSimulationAdapter(graph, { seed: 7, initialState: 'bare' });
for (let triangle = 0; triangle < 4; triangle += 1) {
  dry.species[triangle * 3 + 1] = 0.7;
  dry.biomass[triangle] = 0.7;
}
dry.setEnvironment({ moisture: 0 });
for (let step = 0; step < 900; step += 1) dry.step();
const dryDensity = dry.getStats().avgDensity;
assert.ok(dry.dormantReserves.some((value) => value > 0));
assert.ok(dry.deadMatter.some((value) => value > 0));
dry.setEnvironment({ moisture: 0.85 });
for (let step = 0; step < 1200; step += 1) dry.step();
assert.ok(dry.getStats().avgDensity > dryDensity);
for (let triangle = 0; triangle < graph.triangleCount; triangle += 1) {
  assert.equal(dry.species[triangle * 3], 0);
  assert.equal(dry.species[triangle * 3 + 2], 0);
}

const first = new GraphSimulationAdapter(graph, { seed: 99, initialState: 'mature' });
const second = new GraphSimulationAdapter(graph, { seed: 99, initialState: 'mature' });
for (let step = 0; step < 20; step += 1) { first.step(); second.step(); }
assert.deepEqual(first.species, second.species);
const firstStats=first.getStats(),secondStats=second.getStats();delete firstStats.lastTickMs;delete secondStats.lastTickMs;
assert.deepEqual(firstStats, secondStats);
assert.equal(first.getStats().nonfinite, 0);

const frameRates = [30, 60, 120].map((fps) => {
  const simulation = new GraphSimulationAdapter(graph, { seed: 111, initialState: 'mature' });
  simulation.setRunning(true);
  for (let frame = 0; frame < fps * 2; frame += 1) simulation.updateFrame(1 / fps);
  return simulation;
});
assert.deepEqual(frameRates[0].species, frameRates[1].species);
assert.deepEqual(frameRates[1].species, frameRates[2].species);
assert.equal(frameRates[0].totalTicks, 40);

assert.throws(() => new GraphSimulationAdapter(graph, { seed: -1 }));
assert.throws(() => adapter.step(0));
assert.throws(() => adapter.updateFrame(-1));
assert.throws(() => adapter.setEnvironment({ moisture: NaN }));
assert.throws(() => adapter.setLightDirection({ x: 0, y: 0, z: 0 }));
assert.throws(() => adapter.convertSpecies(3));
assert.throws(() => adapter.paintFromFace(-1));
assert.throws(() => adapter.paintFromFace(0, { radius: 0 }));
assert.throws(() => adapter.paintFromFace(0, { strength: 2 }));

console.log('PASS graph simulation adapter carries lifecycle state and isolates disconnected components');
