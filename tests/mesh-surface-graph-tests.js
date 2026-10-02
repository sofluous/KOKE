import assert from 'node:assert/strict';
import { createMeshSurfaceGraph, MeshSurfaceField } from '../src/mesh-surface-graph.js';

const positions=new Float32Array([
  0,0,0, 1,0,0, 0,1,0, 1,1,0,
  1,0,1, 1,1,1,
  0,0,0.04, 1,0,0.04, 0,1,0.04, 1,1,0.04,
]);
const indices=new Uint32Array([
  0,1,2, 1,3,2,
  1,4,3, 4,5,3,
  6,7,8, 7,9,8,
]);

const graph=createMeshSurfaceGraph(positions,{indices});
assert.equal(graph.triangleCount,6);
assert.equal(graph.vertexCount,10);
assert.equal(graph.componentCount,2);
assert.equal(graph.boundaryEdgeCount,10);
assert.equal(graph.nonManifoldEdgeCount,0);
assert.deepEqual([...graph.neighbors[1]],[0,2]);
assert.equal(graph.componentIds[0],graph.componentIds[3]);
assert.notEqual(graph.componentIds[0],graph.componentIds[4]);

const location=graph.pointAt(2,{a:0.2,b:0.3,c:0.5});
assert.ok([location.x,location.y,location.z,location.normal.x,location.normal.y,location.normal.z].every(Number.isFinite));
assert.equal(location.component,graph.componentIds[2]);
assert.deepEqual(graph.sample(8,{seed:42}),graph.sample(8,{seed:42}));
assert.notDeepEqual(graph.sample(8,{seed:42}),graph.sample(8,{seed:43}));

const expanded=new Float32Array([...indices].flatMap((index)=>[positions[index*3],positions[index*3+1],positions[index*3+2]]));
const unindexed=createMeshSurfaceGraph(expanded);
assert.equal(unindexed.componentCount,2);
assert.equal(unindexed.vertexCount,10);

const painted=new MeshSurfaceField(graph);
assert.equal(painted.paintFromTriangle(0,{radius:10,strength:1}),4);
for(let triangle=0;triangle<4;triangle++)assert.ok(painted.values[triangle]>0);
assert.equal(painted.values[4],0);assert.equal(painted.values[5],0);

const propagated=new MeshSurfaceField(graph);propagated.values[0]=1;
for(let step=0;step<40;step++)propagated.step({diffusion:1,growth:0,decay:0,dt:0.1});
assert.ok(propagated.values[3]>0);
assert.equal(propagated.values[4],0);assert.equal(propagated.values[5],0);

assert.throws(()=>createMeshSurfaceGraph(new Float32Array([0,0,0,1,0,0,2,0,0])));
assert.throws(()=>painted.paintFromTriangle(0,{radius:-1}));
console.log('PASS mesh surface graph samples, paints, and propagates across folded adjacency without crossing disconnected surfaces');
