import assert from 'node:assert/strict';
import { mossSpeciesCatalog } from '../src/simulation.js';

const [cushion,sheet,feather]=mossSpeciesCatalog.map((species)=>species.renderProfile);
for(const profile of [cushion,sheet,feather]){
  assert.deepEqual(Object.keys(profile),['shootWidth','shootHeight','creep','clumpWidth','clumpHeight','microScale']);
  assert.ok(Object.values(profile).every((value)=>Number.isFinite(value)&&value>0));
}
assert.ok(sheet.shootWidth>cushion.shootWidth&&sheet.shootHeight<cushion.shootHeight);
assert.ok(sheet.creep>cushion.creep&&sheet.clumpWidth<cushion.clumpWidth&&sheet.clumpHeight<cushion.clumpHeight);
assert.ok(feather.shootWidth<cushion.shootWidth&&feather.shootHeight>cushion.shootHeight);
assert.ok(feather.microScale>cushion.microScale);

console.log('PASS moss render profiles preserve distinct cushion, sheet, and feather silhouettes');
