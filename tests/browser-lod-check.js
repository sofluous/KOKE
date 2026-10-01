const wait=(ms=350)=>new Promise((resolve)=>setTimeout(resolve,ms));
const change=(id,value,event='change')=>{
  const input=document.getElementById(id);
  input.value=String(value);
  input.dispatchEvent(new Event(event,{bubbles:true}));
};
const toggle=(id,value)=>{
  const input=document.getElementById(id);
  input.checked=value;
  input.dispatchEvent(new Event('change',{bubbles:true}));
};

export async function runLodChecks() {
  const k=window.koke,passed=[];
  const check=(condition,label)=>{if(!condition)throw new Error(label);passed.push(label);};
  document.getElementById('maturePresetBtn').click();
  change('representationInput','shoots');
  change('detailInput','high');
  change('mossDensityInput',0.5,'input');
  toggle('adaptiveDetailInput',true);

  k.setViewPreset('macro');await wait();
  const macro=k.mossRenderer.getStats();
  k.setViewPreset('iso');await wait();
  const overview=k.mossRenderer.getStats();
  check(macro.lodFactor===1&&macro.tuftCount===30000,'macro view retains the full requested shoot count');
  check(overview.lodFactor<macro.lodFactor&&overview.tuftCount<macro.tuftCount,'overview view reduces detailed shoots');

  toggle('adaptiveDetailInput',false);await wait();
  const disabled=k.mossRenderer.getStats();
  check(disabled.lodFactor===1&&disabled.tuftCount===macro.tuftCount,'disabling adaptive detail restores the manual budget');

  change('representationInput','cards');
  toggle('adaptiveDetailInput',true);await wait();
  const cards=k.mossRenderer.getStats();
  check(cards.tuftCount===macro.tuftCount,'adaptive detail does not reduce card representations');
  check(k.renderer.info.programs.every((program)=>program.diagnostics?.runnable!==false),'GPU programs remain runnable');
  return {passed,macro,overview,disabled,cards,gpu:{...k.renderer.info.render}};
}
