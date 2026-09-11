export async function runStage2Checks() {
  const k=window.koke,passed=[],triangles={};
  const check=(ok,label)=>{if(!ok)throw new Error(label);passed.push(label);};
  const el=id=>document.getElementById(id);
  const change=(id,value,event='change')=>{const input=el(id);input.value=String(value);input.dispatchEvent(new Event(event,{bubbles:true}));};
  const wait=(ms=220)=>new Promise(resolve=>setTimeout(resolve,ms));
  const fieldBefore=k.simulation.channelsA.slice(),positionsBefore=k.simulation.positions.slice();
  change('surfaceInput','sphere');await wait();
  check(k.ui.state.surface==='sphere'&&fieldBefore.every((v,i)=>v===k.simulation.channelsA[i]),'surface change preserves growth field');
  check(positionsBefore.some((v,i)=>v!==k.simulation.positions[i])&&k.spores.getStats().active===0,'surface change rebuilds positions and clears spores');
  change('surfaceInput','icosahedron');await wait();
  const highCount=k.mossRenderer.mesh.geometry.attributes.position.count;
  change('surfaceDetailInput','low');await wait();
  check(k.mossRenderer.mesh.geometry.attributes.position.count<highCount,'low surface detail reduces substrate vertices');
  for(const mode of ['shoots','cards','diamonds','triangles','clumps','surface']){
    change('representationInput',mode);await wait();triangles[mode]=k.renderer.info.render.triangles;
  }
  check(triangles.surface<triangles.triangles&&triangles.triangles<triangles.cards&&triangles.cards<triangles.shoots,'representations provide ordered triangle budgets');
  change('representationInput','triangles');change('mossDensityInput',0.25,'input');await wait();
  check(k.mossRenderer.getStats().tuftCount===15000&&k.renderer.info.render.triangles<triangles.triangles,'density reduces active instances and triangles');
  change('mossScaleInput',1.4,'input');change('mossAspectInput',0.6,'input');change('mossOrientationInput',0.25,'input');
  check(k.ui.state.mossScale===1.4&&k.ui.state.mossAspect===0.6&&k.ui.state.mossOrientation===0.25,'shape controls update renderer state');
  k.captureSnapshot(false);const before=el('snapshotThumb').src;
  change('mossRootColorInput','#542b8f','input');change('mossTipColorInput','#f0c94d','input');change('mossColorSourceInput','height');change('mossColorRangeInput',1.7,'input');el('mossColorInvertInput').click();await wait();
  check(k.ui.state.mossRootColor==='#542b8f'&&k.ui.state.mossColorSource==='height'&&k.ui.state.mossColorInvert,'palette and mapping controls update state');
  k.captureSnapshot(false);check(el('snapshotThumb').src!==before,'palette changes alter rendered output');
  change('surfaceInput','rock');change('surfaceDetailInput','high');change('representationInput','shoots');change('mossDensityInput',1,'input');
  change('mossScaleInput',1,'input');change('mossAspectInput',1,'input');change('mossOrientationInput',1,'input');
  change('mossRootColorInput','#24451f','input');change('mossTipColorInput','#a5c950','input');change('mossColorSourceInput','species');change('mossColorRangeInput',1,'input');el('mossColorInvertInput').click();
  await wait();
  return {passed,triangles};
}
