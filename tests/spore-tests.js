import assert from 'node:assert/strict';
import {FieldSimulation} from '../src/field-sim.js';
import {SporeSimulation} from '../src/spores.js';
import {sampleSphere} from '../src/substrate.js';
const run=(name,fn)=>{fn();console.log('PASS '+name);};
const setup=()=>{const f=new FieldSimulation({sampleSurface:sampleSphere},{mapSize:32,initialState:'bare'});const s=new SporeSimulation(f,{radiusAt:()=>2.2,capacity:4});return {f,s};};
run('spores land before delayed germination with preserved species',()=>{
  const {f,s}=setup();const i=f.indexAt({x:0.3,y:2.1,z:0.2});f.channelsA[i*4+2]=0.8;
  assert.ok(s.release(i));assert.equal(f.germinations,0);
  let landed=false;
  for(let tick=0;tick<300;tick++){
    s.step(0.05);
    if(s.landed&&!landed){landed=true;assert.equal(s.germinated,0);assert.equal(f.germinations,0);}
  }
  assert.ok(landed);assert.equal(s.germinated,1);assert.equal(f.germinations,1);
  assert.equal(s.lastEvent.species,2);assert.ok(f.channelsA[s.lastEvent.index*4+2]>0);
});
run('spore pools stay bounded and reset clears pending births',()=>{
 const {f,s}=setup();const i=f.indexAt({x:0,y:2.2,z:0});
 for(let k=0;k<4;k++)assert.ok(s.release(i));assert.equal(s.release(i),false);
 s.reset();for(let k=0;k<200;k++)s.step(0.05);assert.equal(s.getStats().active,0);assert.equal(f.germinations,0);
});
run('dry landing cannot germinate',()=>{
 const {f,s}=setup();f.wetMap.fill(0);const i=f.indexAt({x:0,y:2.2,z:0});s.release(i);
 for(let k=0;k<300;k++)s.step(0.05);assert.ok(s.landed>0);assert.equal(f.germinations,0);
});
