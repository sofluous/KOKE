const wait=(ms=500)=>new Promise((resolve)=>setTimeout(resolve,ms));
const change=(id,value,event='change')=>{
  const input=document.getElementById(id);
  input.value=String(value);
  input.dispatchEvent(new Event(event,{bubbles:true}));
};

export async function prepareMorphology(speciesId) {
  const k=window.koke;
  document.getElementById('maturePresetBtn').click();
  k.simulation.convertSpecies(speciesId);
  k.spores.reset();
  k.mossRenderer.setCoverage(k.simulation.fillCoverageMap());
  change('representationInput','shoots');
  change('detailInput','high');
  change('mossDensityInput',0.5,'input');
  const adaptive=document.getElementById('adaptiveDetailInput');
  adaptive.checked=false;adaptive.dispatchEvent(new Event('change',{bubbles:true}));
  k.setViewPreset('macro');
  await wait();
  k.effects.render();
  const runnable=k.renderer.info.programs.every((program)=>program.diagnostics?.runnable!==false);
  if(!runnable)throw new Error('A morphology shader failed to compile');
  return {speciesId,runnable,rendering:k.mossRenderer.getStats(),gpu:{...k.renderer.info.render}};
}
