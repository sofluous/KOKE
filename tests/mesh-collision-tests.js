import assert from 'node:assert/strict';
import { GraphSimulationAdapter } from '../src/graph-simulation-adapter.js';
import { createMeshCollisionAdapter, validateMeshGraphGeometry } from '../src/mesh-collision.js';
import { createMeshSurfaceGraph } from '../src/mesh-surface-graph.js';

const positions = new Float32Array([
  0, 0, 0, 1, 0, 0, 0, 1, 0,
  1, 0, 0, 1, 1, 0, 0, 1, 0,
  0, 0, 0.04, 1, 0, 0.04, 0, 1, 0.04,
]);
const graph = createMeshSurfaceGraph(positions);
const positionAttribute = {
  array: positions, itemSize: 3, count: positions.length / 3,
  getX(index) { return this.array[index * 3]; },
  getY(index) { return this.array[index * 3 + 1]; },
  getZ(index) { return this.array[index * 3 + 2]; },
};
const geometry = { attributes: { position: positionAttribute }, index: null };
assert.deepEqual(validateMeshGraphGeometry(geometry, graph), { faceCount: 3, indexed: false, tolerance: 1e-5 });

class Point {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Point(this.x, this.y, this.z); }
}
const mesh = {
  geometry,
  worldToLocal(point) { point.x -= 4; point.y -= 5; point.z -= 6; return point; },
};
const collision = createMeshCollisionAdapter(mesh, graph);
const hit = { object: mesh, faceIndex: 0, point: new Point(4.25, 5.25, 6), distance: 2.5 };
const resolved = collision.resolveHit(hit);
assert.equal(resolved.faceIndex, 0);
assert.equal(resolved.component, graph.componentIds[0]);
assert.ok(Math.abs(resolved.barycentric.a - 0.5) < 1e-7);
assert.ok(Math.abs(resolved.barycentric.b - 0.25) < 1e-7);
assert.ok(Math.abs(resolved.barycentric.c - 0.25) < 1e-7);
assert.deepEqual(resolved.point, { x: 0.25, y: 0.25, z: 0 });
assert.deepEqual(resolved.worldPoint, { x: 4.25, y: 5.25, z: 6 });
assert.equal(resolved.distance, 2.5);

const raycaster = { intersectObject(target, recursive) { assert.equal(target, mesh); assert.equal(recursive, false); return [hit]; } };
assert.deepEqual(collision.raycast(raycaster), resolved);
assert.equal(collision.raycast({ intersectObject() { return []; } }), null);

const simulation = new GraphSimulationAdapter(graph, { initialState: 'bare' });
const painted = collision.paintHit(simulation, hit, { radius: 2, strength: 1, speciesId: 1 });
assert.ok(painted.changed >= 2);
assert.equal(painted.collision.faceIndex, 0);
assert.ok(simulation.species[1] > 0);
assert.equal(simulation.species[2 * 3 + 1], 0, 'nearby disconnected face remains unpainted');

const reordered = new Float32Array(positions);
reordered.set(positions.subarray(3, 6), 0);
reordered.set(positions.subarray(0, 3), 3);
assert.throws(() => validateMeshGraphGeometry({ attributes: { position: { array: reordered, itemSize: 3, count: 9 } } }, graph));
assert.throws(() => collision.resolveHit({ object: {}, faceIndex: 0, point: hit.point }));
assert.throws(() => collision.resolveHit({ object: mesh, faceIndex: 9, point: hit.point }));
assert.throws(() => collision.resolveHit({ object: mesh, faceIndex: 0, point: new Point(10, 10, 10) }));

console.log('PASS mesh collision preserves face identity and connects ray hits to graph painting');
