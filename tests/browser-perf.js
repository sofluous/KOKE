export async function measurePlayback() {
  const k=window.koke, records=[];
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  k.effects.setEnabled(false);k.mossRenderer.setDew(false);k.setViewPreset('iso');
  document.getElementById('simPlayBtn').click();
  for(const quality of ['high','low']) {
    k.mossRenderer.setQuality(quality);
    for(let i=0;i<20;i++)await nextFrame();
    const times=[];let previous=await nextFrame();
    for(let i=0;i<100;i++){const now=await nextFrame();times.push(now-previous);previous=now;}
    times.sort((a,b)=>a-b);
    records.push({quality,medianMs:times[50],p95Ms:times[95],drawCalls:k.renderer.info.render.calls,triangles:k.renderer.info.render.triangles,simTickMs:k.simulation.lastTickMs});
  }
  document.getElementById('simPlayBtn').click();k.mossRenderer.setQuality('high');
  const gl=k.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',browser:navigator.userAgent,
    canvas:[gl.drawingBufferWidth,gl.drawingBufferHeight],pixelRatio:k.renderer.getPixelRatio(),records};
}
