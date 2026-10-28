function makeGlb() {
  const positions=new Float32Array([
    0,0,0, 1,0,0, 0,1,0,
    1,0,0, 1,1,0, 0,1,0,
    0,0,0.08, 1,0,0.08, 0,1,0.08,
  ]);
  const descriptor={asset:{version:'2.0'},buffers:[{byteLength:positions.byteLength}],bufferViews:[{buffer:0,byteOffset:0,byteLength:positions.byteLength,target:34962}],accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3',min:[0,0,0],max:[1,1,0.08]}],meshes:[{primitives:[{attributes:{POSITION:0},mode:4}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
  const encoder=new TextEncoder(),jsonRaw=encoder.encode(JSON.stringify(descriptor)),jsonLength=(jsonRaw.length+3)&~3,binLength=(positions.byteLength+3)&~3,total=12+8+jsonLength+8+binLength;
  const buffer=new ArrayBuffer(total),view=new DataView(buffer),bytes=new Uint8Array(buffer);let offset=0;
  view.setUint32(offset,0x46546c67,true);view.setUint32(offset+4,2,true);view.setUint32(offset+8,total,true);offset=12;
  view.setUint32(offset,jsonLength,true);view.setUint32(offset+4,0x4e4f534a,true);offset+=8;bytes.fill(0x20,offset,offset+jsonLength);bytes.set(jsonRaw,offset);offset+=jsonLength;
  view.setUint32(offset,binLength,true);view.setUint32(offset+4,0x004e4942,true);offset+=8;bytes.set(new Uint8Array(positions.buffer),offset);
  return new File([buffer],'folded-open.glb',{type:'model/gltf-binary'});
}

export async function runGraphRuntimeChecks() {
  const wait=(ms=350)=>new Promise(resolve=>setTimeout(resolve,ms));
  const setControl=(id,value)=>{const control=document.getElementById(id);control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}));};
  setControl('detailInput','low');setControl('representationInput','surface');
  const previousRuntime=window.koke.activeRuntime;
  const input=document.getElementById('surfaceFileInput'),transfer=new DataTransfer();transfer.items.add(makeGlb());
  Object.defineProperty(input,'files',{value:transfer.files,configurable:true});input.dispatchEvent(new Event('change',{bubbles:true}));
  const deadline=performance.now()+10000;
  while((window.koke.activeRuntime===previousRuntime||window.koke.activeRuntime.type!=='graph')&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
  const k=window.koke,passed=[],check=(condition,label)=>{if(!condition)throw new Error(label);passed.push(label);};
  check(k.activeRuntime.type==='graph','general GLB activates graph runtime');
  const modelDefaults=k.activeRuntime.source.modelDefaults,scaleStats=k.mossRenderer.getStats();
  check(modelDefaults.mossScale>=0.65&&modelDefaults.mossScale<=1.25&&modelDefaults.brushScale>=0.55&&modelDefaults.brushScale<=1.35&&k.activeRuntime.brushScale===modelDefaults.brushScale&&scaleStats.modelScale===Number(modelDefaults.mossScale.toFixed(3))&&scaleStats.brushScale===Number(modelDefaults.brushScale.toFixed(3)),'imported model resolves bounded moss and brush scales');
  check(k.simulation.cellCount===3&&k.mossRenderer.getStats().type==='graph','graph simulation and renderer share imported faces');
  check(k.mossRenderer.getStats().anchors===0,'Surface graph runtime defers geometric anchor allocation');
  check(k.mossRenderer.collision.validation.faceCount===3,'collision identity matches imported face order');
  const surfaceColors=k.mossRenderer.mesh.geometry.attributes.color.array.slice();
  k.simulation.paintFromFace(0,{radius:2,strength:1,speciesId:2});k.mossRenderer.update(k.spores);
  check(k.simulation.species.some(value=>value>0)&&surfaceColors.some((value,index)=>value!==k.mossRenderer.mesh.geometry.attributes.color.array[index]),'painted graph state reaches Surface colors without anchors');
  const detail=document.getElementById('detailInput');detail.value='high';detail.dispatchEvent(new Event('change',{bubbles:true}));
  check(k.mossRenderer.getStats().anchors===0,'hidden Surface mode defers High anchor expansion');
  const representation=document.getElementById('representationInput');representation.value='cards';representation.dispatchEvent(new Event('change',{bubbles:true}));
  check(k.mossRenderer.getStats().representation==='cards','existing representation control targets graph renderer');
  while(k.mossRenderer.getStats().expanding&&performance.now()<deadline)await new Promise(resolve=>requestAnimationFrame(resolve));
  check(k.mossRenderer.getStats().anchors===60000&&k.mossRenderer.anchorState.species.some(value=>value>0),'High expansion receives requested anchors and painted lifecycle state');
  representation.value='shoots';representation.dispatchEvent(new Event('change',{bubbles:true}));
  k.setViewPreset('macro');await wait();const macro=k.mossRenderer.getStats();
  k.setViewPreset('iso');await wait();const overview=k.mossRenderer.getStats();
  check(macro.lodFactor===1&&overview.lodFactor<1&&overview.instances<macro.instances,'overview distance reduces graph detailed shoots');
  representation.value='cards';representation.dispatchEvent(new Event('change',{bubbles:true}));await wait();
  check(k.mossRenderer.getStats().instances===macro.instances,'graph adaptive detail leaves cards at the manual budget');
  const surface=document.getElementById('surfaceInput');surface.value='sphere';surface.dispatchEvent(new Event('change',{bubbles:true}));
  check(k.activeRuntime.type==='radial','built-in selection restores radial runtime');
  surface.value='imported';surface.dispatchEvent(new Event('change',{bubbles:true}));
  check(k.activeRuntime.type==='graph'&&k.simulation.cellCount===3,'imported selection restores graph runtime state');
  k.effects.render();
  check(k.renderer.info.programs.every(program=>program.diagnostics?.runnable!==false),'graph shaders compile without reported failure');
  return {passed,macro,overview,stats:k.diagnostics.buildSnapshot()};
}
