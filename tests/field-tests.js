import { FieldSimulation } from '../src/field-sim.js';
import { sampleIcosahedron, sampleRock, sampleSphere, surfaceCatalog } from '../src/substrate.js';
import assert from 'node:assert/strict';
const make = (options = {}) => new FieldSimulation({ sampleSurface: sampleSphere }, { mapSize: 16, ...options });
const run = (name, fn) => { fn(); console.log('PASS ' + name); };
run('built-in surface samplers remain finite and normalized',()=>{
  assert.deepEqual(Object.keys(surfaceCatalog),['rock','sphere','icosahedron']);
  for(const sample of [sampleRock,sampleSphere,sampleIcosahedron])for(const [u,v] of [[0,0.5],[0.25,0.75],[0.99,0.02]]){
    const p=sample(u,v),n=p.normal;assert.ok([p.x,p.y,p.z,n.x,n.y,n.z,p.heightNorm].every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(n.x,n.y,n.z)-1)<1e-6);
  }
});
run('surface replacement preserves the growth field and rebuilds positions',()=>{
  const f=make(),field=f.channelsA.slice(),before=f.positions.slice();f.setSurface(sampleIcosahedron);
  assert.deepEqual(f.channelsA,field);assert.notDeepEqual(f.positions,before);assert.equal(f.dirty,true);
});
run('active defaults remain finite through long evolution', () => {
  const f = make(); for (let i = 0; i < 2400; i++) f.stepBatch();
  for (const key of ['channelsA','habitatMap','massMap','stressMap','wetMap']) assert.ok(f[key].every(Number.isFinite), key);
});
run('invalid settings are rejected without mutation', () => {
  const f = make(); assert.throws(() => f.setEnvironment({ moisture: NaN }));
  assert.throws(() => f.setLightDirection({x:0,y:0,z:0})); assert.equal(f.environment.moisture, 0.72);
});
run('empty field stays bare and species lineage survives spread', () => {
  const f = make({initialState:'bare'}); for(let i=0;i<100;i++) f.stepBatch();
  assert.equal(f.getStats().avgDensity, 0); assert.ok(f.massMap.every(v => v === 0));
  f.channelsA[128*4] = 0.8; for(let i=0;i<100;i++) f.stepBatch();
  assert.ok(f.channelsA[129*4]>0); for(let i=0;i<f.cellCount;i++) {assert.equal(f.channelsA[i*4+1],0);assert.equal(f.channelsA[i*4+2],0);}
});
run('surface samples and brush agree across seam and poles', () => {
  const f = make({initialState:'bare'});
  for(let i=0;i<f.cellCount;i++) assert.equal(f.indexAt({x:f.positions[i*3],y:f.positions[i*3+1],z:f.positions[i*3+2]}),i);
  f.paintAt({x:-2.2,y:0,z:0},{radius:0.8,strength:1});
  assert.ok(f.channelsA[(8*16)*4]>0);assert.ok(f.channelsA[(8*16+15)*4]>0);
  f.paintAt({x:0,y:2.2,z:0},{radius:0.8,strength:1});
  for(let x=0;x<16;x++) assert.ok(f.channelsA[(15*16+x)*4]>0);
});
run('light and slope controls rebuild habitat idempotently', () => {
  const f = make(), before = f.habitatMap.slice(); f.setEnvironment({slopeBias:0}); assert.notDeepEqual(f.habitatMap,before);
  f.setLightDirection({x:1,y:0,z:0}); const light = f.habitatMap.slice(); f._buildStaticMaps(); assert.deepEqual(f.habitatMap,light);
  f.setLightDirection({x:-1,y:0,z:0}); assert.notDeepEqual(f.habitatMap,light);
});
run('fixed time produces identical state at 30, 60, and 120 fps', () => {
  const simulations = [30,60,120].map(fps=>{const f=make();f.setRunning(true);for(let i=0;i<fps*3;i++) f.updateFrame(1/fps);return f;});
  assert.deepEqual(simulations[0].channelsA,simulations[1].channelsA);assert.deepEqual(simulations[1].channelsA,simulations[2].channelsA);
  const f=simulations[0], time=f.time;f.setRunning(false);f.updateFrame(1);assert.equal(f.time,time);
});
run('full area reports 100 percent and drought collapses thickness', () => {
  const f=make(); for(let i=0;i<f.cellCount;i++){f.channelsA[i*4]=1;f.channelsA[i*4+1]=0;f.channelsA[i*4+2]=0;f.massMap[i]=1;}
  assert.equal(f.getStats().avgDensity,1);assert.equal(f.getStats().activeRatio,1);
  f.setEnvironment({moisture:0});for(let i=0;i<800;i++)f.stepBatch();
  assert.ok(f.getStats().avgDensity<0.15);assert.ok(f.massMap.every(v=>v<0.2));assert.ok(f.collapses>0);
});
run('rehydration restores dormant colonies without introducing species', () => {
  const f=make({initialState:'bare'});
  for(let i=0;i<f.cellCount;i++) {f.channelsA[i*4+2]=0.6;f.massMap[i]=0.6;}
  f.setEnvironment({moisture:0});for(let i=0;i<800;i++)f.stepBatch();
  const dry=f.getStats().avgDensity;
  assert.ok(f.dormantMap.some(v=>v>0));
  f.setEnvironment({moisture:0.8});for(let i=0;i<1200;i++)f.stepBatch();
  assert.ok(f.getStats().avgDensity>dry+0.02);
  for(let i=0;i<f.cellCount;i++){assert.equal(f.channelsA[i*4],0);assert.equal(f.channelsA[i*4+1],0);}
  f.reset('bare');assert.ok(f.dormantMap.every(v=>v===0));
});
run('gravity and aging settings change evolution',()=>{
  const a=make({environment:{gravityCreep:0,cycleSpeed:0}}),b=make({environment:{gravityCreep:1,cycleSpeed:1}});
  a.ageMap.fill(200);b.ageMap.fill(200);
  for(let i=0;i<120;i++){a.stepBatch();b.stepBatch();}
  assert.notDeepEqual(a.channelsA,b.channelsA);
});
