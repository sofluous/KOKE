import assert from 'node:assert/strict';
import { GraphSimulationAdapter } from '../src/graph-simulation-adapter.js';
import { createMeshRenderAnchorBuilder, createMeshRenderAnchors, MAX_RENDER_ANCHORS, MeshRenderAnchorState } from '../src/mesh-render-anchors.js';
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
const anchors = createMeshRenderAnchors(graph, { count: 600, seed: 73 });
const repeated = createMeshRenderAnchors(graph, { count: 600, seed: 73 });
const varied = createMeshRenderAnchors(graph, { count: 600, seed: 74 });
const lowPrefix = createMeshRenderAnchors(graph, { count: 300, seed: 73 });
const chunkedBuilder = createMeshRenderAnchorBuilder(graph, { count: 600, seed: 73 });
while (!chunkedBuilder.done) chunkedBuilder.advance(37);
assert.equal(chunkedBuilder.progress, 1);

for (const name of ['positions', 'normals', 'tangents', 'bitangents', 'barycentrics', 'triangles', 'components', 'variations']) {
  assert.deepEqual(anchors[name], repeated[name], `${name} remains stable for a seed`);
  assert.deepEqual(anchors[name], chunkedBuilder.anchors[name], `${name} is independent of batch size`);
}
assert.notDeepEqual(anchors.positions, varied.positions);
for (const name of ['positions', 'normals', 'tangents', 'bitangents', 'barycentrics']) {
  assert.deepEqual(lowPrefix[name], anchors[name].slice(0, lowPrefix[name].length), `${name} prefix survives expansion`);
}
for (const name of ['triangles', 'components', 'variations']) {
  assert.deepEqual(lowPrefix[name], anchors[name].slice(0, lowPrefix[name].length), `${name} prefix survives expansion`);
}

const componentCounts = [0, 0];
for (let anchor = 0; anchor < anchors.count; anchor += 1) {
  const offset = anchor * 3;
  const triangle = anchors.triangles[anchor];
  const barycentric = anchors.barycentrics.subarray(offset, offset + 3);
  const resolved = graph.pointAt(triangle, { a: barycentric[0], b: barycentric[1], c: barycentric[2] });
  assert.ok(Math.abs(barycentric[0] + barycentric[1] + barycentric[2] - 1) < 1e-6);
  assert.ok(barycentric.every((value) => value >= 0 && value <= 1));
  assert.ok(Math.hypot(
    anchors.positions[offset] - resolved.x,
    anchors.positions[offset + 1] - resolved.y,
    anchors.positions[offset + 2] - resolved.z,
  ) < 1e-6);
  const normal = anchors.normals.subarray(offset, offset + 3);
  const tangent = anchors.tangents.subarray(offset, offset + 3);
  const bitangent = anchors.bitangents.subarray(offset, offset + 3);
  assert.ok(Math.abs(Math.hypot(...normal) - 1) < 1e-6);
  assert.ok(Math.abs(Math.hypot(...tangent) - 1) < 1e-6);
  assert.ok(Math.abs(Math.hypot(...bitangent) - 1) < 1e-6);
  assert.ok(Math.abs(normal[0] * tangent[0] + normal[1] * tangent[1] + normal[2] * tangent[2]) < 1e-6);
  assert.equal(anchors.components[anchor], graph.componentIds[triangle]);
  componentCounts[anchors.components[anchor]] += 1;
}
assert.ok(Math.abs(componentCounts[0] / anchors.count - 2 / 3) < 0.02);
assert.ok(Math.abs(componentCounts[1] / anchors.count - 1 / 3) < 0.02);

const graphWithDegenerate = createMeshSurfaceGraph(new Float32Array([
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 0, 0, 0, 1, 0,
]));
const validAnchors = createMeshRenderAnchors(graphWithDegenerate, { count: 20, seed: 2 });
assert.ok(validAnchors.triangles.every((triangle) => triangle === 1));

const simulation = new GraphSimulationAdapter(graph, { initialState: 'bare' });
for (let triangle = 0; triangle < graph.triangleCount; triangle += 1) {
  const base = triangle * 3;
  simulation.species[base + triangle % 3] = 0.1 + triangle * 0.1;
  simulation.dormantReserves[base + (triangle + 1) % 3] = triangle * 0.01;
  simulation.vitality[triangle] = triangle / 10;
  simulation.moisture[triangle] = triangle / 9;
  simulation.biomass[triangle] = triangle / 8;
  simulation.age[triangle] = triangle * 2;
  simulation.stress[triangle] = triangle / 7;
  simulation.deadMatter[triangle] = triangle / 6;
}
const sampled = new MeshRenderAnchorState(anchors, 3);
assert.equal(sampled.update(simulation.getState()), true);
assert.equal(sampled.update(simulation.getState()), false);
for (let anchor = 0; anchor < anchors.count; anchor += 1) {
  const triangle = anchors.triangles[anchor];
  const source = triangle * 3, target = anchor * 3;
  assert.deepEqual(
    sampled.species.subarray(target, target + 3),
    simulation.species.subarray(source, source + 3),
  );
  assert.equal(sampled.biomass[anchor], simulation.biomass[triangle]);
  assert.equal(sampled.dominantSpecies[anchor], triangle % 3);
}

const rangeSampled = new MeshRenderAnchorState(anchors, 3);
const lifecycleState = simulation.getState();
for (let start = 0; start < anchors.count; start += 47) {
  rangeSampled.copyRange(lifecycleState, start, Math.min(anchors.count, start + 47));
}
assert.equal(rangeSampled.revision, -1, 'range copies remain uncommitted until the complete revision is present');
rangeSampled.commit(lifecycleState);
for (const name of ['species', 'dormantReserves', 'density', 'dominantSpecies', 'vitality', 'moisture', 'biomass', 'age', 'stress', 'deadMatter']) {
  assert.deepEqual(rangeSampled[name], sampled[name], `${name} is independent of lifecycle copy batch size`);
}
assert.equal(rangeSampled.revision, lifecycleState.revision);
assert.throws(() => rangeSampled.copyRange(lifecycleState, -1, 1));
assert.throws(() => rangeSampled.copyRange(lifecycleState, 4, 3));
assert.throws(() => rangeSampled.copyRange(lifecycleState, 0, anchors.count + 1));

const otherGraph = createMeshSurfaceGraph(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
const otherSimulation = new GraphSimulationAdapter(otherGraph, { initialState: 'bare' });
assert.throws(() => sampled.update(otherSimulation.getState()));
assert.throws(() => createMeshRenderAnchors(graph, { count: -1 }));
assert.throws(() => createMeshRenderAnchors(graph, { count: MAX_RENDER_ANCHORS + 1 }));
assert.throws(() => createMeshRenderAnchors(graph, { count: 1, seed: -1 }));
assert.equal(createMeshRenderAnchors(graph, { count: 0 }).positions.length, 0);

console.log('PASS mesh render anchors remain attached, area weighted, deterministic, and lifecycle aware');
