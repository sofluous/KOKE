import assert from 'node:assert/strict';
import { computeShootLodFactor } from '../src/field-renderer.js';

assert.equal(computeShootLodFactor(0),1);
assert.equal(computeShootLodFactor(4),1);
assert.ok(Math.abs(computeShootLodFactor(10)-0.45)<1e-10);
assert.ok(Math.abs(computeShootLodFactor(20)-0.45)<1e-10);

const distances=[4,5,6,7,8,9,10];
const factors=distances.map((distance)=>computeShootLodFactor(distance));
assert.ok(factors.every((value,index)=>index===0||value<=factors[index-1]));
assert.ok(computeShootLodFactor(7)>0.45&&computeShootLodFactor(7)<1);
assert.throws(()=>computeShootLodFactor(NaN));
assert.throws(()=>computeShootLodFactor(5,8,4));

console.log('PASS adaptive shoot detail is smooth, bounded, and monotonic');
