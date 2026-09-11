import { writeFile } from 'node:fs/promises';
const tabs = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const tab = tabs.find((t) => t.url.startsWith('http://127.0.0.1:8765'));
if (!tab) throw new Error('Open KOKE at port 8765 in Edge with remote debugging on port 9333');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let sequence = 0;
const pending = new Map(), errors = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const request = pending.get(message.id); pending.delete(message.id);
    if (message.error) request.reject(message.error); else request.resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown' || message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error' || message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params);
};
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
try {
  await call('Runtime.enable'); await call('Log.enable');
  await call('Log.clear'); errors.length=0;
  await call('Page.bringToFront');
  if (process.env.KOKE_VIEWPORT) {
    const [width, height] = process.env.KOKE_VIEWPORT.split('x').map(Number);
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  }
  if (process.argv[2] === 'reload') { await call('Page.reload', { ignoreCache: true }); await new Promise((r) => setTimeout(r, 7000)); }
  const expression = process.env.KOKE_EXPRESSION || '({ready:!!window.koke,stats:window.koke?.diagnostics.buildSnapshot(),programs:window.koke?.renderer.info.programs.map(p=>({name:p.name,diagnostics:p.diagnostics}))})';
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify({ result, errors }, null, 2));
  if (result.exceptionDetails || errors.length) process.exitCode = 1;
  if (process.argv[3]) {
    await call('Runtime.evaluate', { expression: 'window.koke?.effects.render()' });
    let clip;
    if(process.argv[4]==='canvas') {
      const rect=await call('Runtime.evaluate',{expression:'(()=>{const r=document.getElementById("viewport").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()',returnByValue:true});
      clip=rect.result.value;
    }
    const capture = await call('Page.captureScreenshot', { format: 'png', ...(clip ? {clip} : {}) });
    await writeFile(process.argv[3], Buffer.from(capture.data, 'base64'));
  }
} finally { ws.close(); }
