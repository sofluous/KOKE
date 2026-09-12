import { FieldSimulation } from '../src/field-sim.js';
import { createSurfaceSampler, sampleIcosahedron, sampleRock, sampleSphere, surfaceCatalog } from '../src/substrate.js';
import { createRadialSurface } from '../src/radial-surface.js';
import assert from 'node:assert/strict';
const make = (options = {}) => new FieldSimulation({ sampleSurface: sampleSphere }, { mapSize: 16, ...options });
const run = (name, fn) => { fn(); console.log('PASS ' + name); };
run('built-in surface samplers remain finite and normalized',()=>{
  assert.deepEqual(Object.keys(surfaceCatalog),['rock','faceted-rock','sphere','ellipsoid','rounded-cube','icosahedron']);
  for(const sample of [sampleRock,sampleSphere,sampleIcosahedron,createSurfaceSampler('ellipsoid'),createSurfaceSampler('rounded-cube')])for(const [u,v] of [[0,0.5],[0.25,0.75],[0.99,0.02]]){
    const p=sample(u,v),n=p.normal;assert.ok([p.x,p.y,p.z,n.x,n.y,n.z,p.heightNorm].every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(n.x,n.y,n.z)-1)<1e-6);
  }
});
run('seeded rock deformity is reproducible and changes between seeds',()=>{
  const a=createSurfaceSampler('faceted-rock',{seed:12,deformity:0.8}),b=createSurfaceSampler('faceted-rock',{seed:12,deformity:0.8}),c=createSurfaceSampler('faceted-rock',{seed:13,deformity:0.8});
  assert.deepEqual(a(0.31,0.62),b(0.31,0.62));assert.notDeepEqual(a(0.31,0.62),c(0.31,0.62));
});
run('closed radial triangle surfaces produce finite samples and reject open meshes',()=>{
  const top=[0,1,0],bottom=[0,-1,0],east=[1,0,0],west=[-1,0,0],front=[0,0,1],back=[0,0,-1];
  const faces=[[top,east,front],[top,front,west],[top,west,back],[top,back,east],[bottom,front,east],[bottom,west,front],[bottom,back,west],[bottom,east,back]];
  const positions=new Float32Array(faces.flat(2)),radial=createRadialSurface(positions,{width:16,height:8,minCoverage:0.95});
  const sample=radial.sample(0.2,0.7);assert.ok([sample.x,sample.y,sample.z,sample.normal.x,sample.normal.y,sample.normal.z].every(Number.isFinite));
  assert.throws(()=>createRadialSurface(new Float32Array([0,1,0,1,0,0,0,0,1]),{width:8,height:8,minCoverage:0.5}));
});
run('surface replacement preserves the growth field and rebuilds positions',()=>{
  const f=make(),field=f.channelsA.slice(),before=f.positions.slice();f.setSurface(sampleIcosahedron);
  assert.deepEqual(f.channelsA,field);assert.notDeepEqual(f.positions,before);assert.equal(f.dirty,true);
});
run('initialization seed is repeatable within a session and varied across seeds',()=>{
  const a=make({seed:123}),b=make({seed:123}),c=make({seed:456});
  assert.deepEqual(a.channelsA,b.channelsA);assert.deepEqual(a.capacityMap,b.capacityMap);
  assert.notDeepEqual(a.channelsA,c.channelsA);assert.notDeepEqual(a.capacityMap,c.capacityMap);
  assert.throws(()=>make({seed:-1}));assert.throws(()=>make({seed:2**32}));
});
run('single-type resets seed only the selected biological channel',()=>{
  const f=make({initialState:'bare'});f.reset('mature',2);
  assert.ok(f.channelsA.some((value,index)=>index%4===2&&value>0));
  for(let i=0;i<f.cellCount;i++){assert.equal(f.channelsA[i*4],0);assert.equal(f.channelsA[i*4+1],0);}
  assert.throws(()=>f.reset('seed',3));
});
run('type conversion preserves biomass age stress and total coverage',()=>{
  const f=make(),coverage=Array.from({length:f.cellCount},(_,i)=>f.channelsA[i*4]+f.channelsA[i*4+1]+f.channelsA[i*4+2]);
  f.dormantMap[1]=0.2;const mass=f.massMap.slice(),age=f.ageMap.slice(),stress=f.stressMap.slice();
  assert.ok(f.convertSpecies(1)>0);
  for(let i=0;i<f.cellCount;i++){assert.equal(f.channelsA[i*4],0);assert.equal(f.channelsA[i*4+2],0);assert.ok(Math.abs(f.channelsA[i*4+1]-coverage[i])<1e-6);assert.equal(f.dormantMap[i*3],0);assert.equal(f.dormantMap[i*3+2],0);}
  assert.deepEqual(f.massMap,mass);assert.deepEqual(f.ageMap,age);assert.deepEqual(f.stressMap,stress);assert.throws(()=>f.convertSpecies(-1));
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
