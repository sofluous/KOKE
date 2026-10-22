import assert from 'node:assert/strict';
import { GraphSimulationAdapter } from '../src/graph-simulation-adapter.js';
import { GraphSporeSimulation } from '../src/graph-spores.js';
import { createMeshSegmentCollider } from '../src/mesh-collision.js';
import { createMeshSurfaceGraph } from '../src/mesh-surface-graph.js';

const positions = new Float32Array([
  0, 0, 0, 1, 0, 0, 0, 1, 0,
  0, 0, 0.04, 1, 0, 0.04, 0, 1, 0.04,
]);
const graph = createMeshSurfaceGraph(positions);
const collider = createMeshSegmentCollider(graph, { leafSize: 2 });
const nearest = collider.castSegment({ x: 0.25, y: 0.25, z: 1 }, { x: 0.25, y: 0.25, z: -1 });
assert.equal(nearest.faceIndex, 1);
assert.ok(Math.abs(nearest.z - 0.04) < 1e-6);
assert.ok(Math.abs(nearest.barycentric.a + nearest.barycentric.b + nearest.barycentric.c - 1) < 1e-7);
assert.equal(collider.castSegment({ x: 2, y: 2, z: 1 }, { x: 2, y: 2, z: -1 }), null);
assert.equal(collider.castSegment({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }), null);

const field = new GraphSimulationAdapter(graph, { initialState: 'bare' });
field.moisture.fill(1); field.habitat.fill(1); field.species[2] = 0.8; field.biomass[0] = 0.8; field.age[0] = 20;
const landing = graph.pointAt(1, { a: 0.5, b: 0.25, c: 0.25 });
const spores = new GraphSporeSimulation(field, { capacity: 2, collider: { castSegment() { return { ...landing, faceIndex: 1, distance: 0.01 }; } } });
assert.equal(spores.release(0), true);
assert.equal(spores.particles[0].species, 2);
spores.step(0.05);
assert.equal(spores.landed, 1);
assert.equal(spores.particles[0].target, 1);
assert.deepEqual(spores.lastEvent.barycentric, landing.barycentric);
spores.particles[0].delay = 0.05;
spores.step(0.05);
assert.equal(spores.germinated, 1);
assert.equal(field.germinations, 1);
assert.ok(field.species[1 * 3 + 2] > 0);

spores.reset();
assert.equal(spores.getStats().active, 0);
assert.equal(spores.release(0), true); assert.equal(spores.release(0), true); assert.equal(spores.release(0), false);
assert.throws(() => spores.release(-1));
assert.throws(() => spores.step(0));
assert.throws(() => createMeshSegmentCollider(graph, { leafSize: 1 }));

const dry = new GraphSimulationAdapter(graph, { initialState: 'bare' });
dry.moisture.fill(0); dry.habitat.fill(1);
assert.equal(dry.germinate(0, 1), false);
assert.throws(() => dry.germinate(4, 1));

console.log('PASS graph spores use accelerated segment collision and preserve species through germination');
