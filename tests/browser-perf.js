const REPRESENTATIONS = ['surface', 'cards', 'clumps', 'shoots'];
const SURFACES = ['sphere', 'faceted-rock', 'icosahedron'];
const QUALITIES = ['low', 'high'];

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function change(id, value, event = 'change') {
  const input = document.getElementById(id);
  input.value = String(value);
  input.dispatchEvent(new Event(event, { bubbles: true }));
}

async function sampleFrames(k, warmupFrames = 12, sampleFrames = 45) {
  for (let i = 0; i < warmupFrames; i += 1) await nextFrame();
  const times = [];
  let previous = await nextFrame();
  for (let i = 0; i < sampleFrames; i += 1) {
    const now = await nextFrame();
    times.push(now - previous);
    previous = now;
  }
  times.sort((a, b) => a - b);
  const render = k.renderer.info.render;
  return {
    medianMs: Number(percentile(times, 0.5).toFixed(2)),
    p95Ms: Number(percentile(times, 0.95).toFixed(2)),
    drawCalls: render.calls,
    triangles: render.triangles,
    points: render.points,
    simTickMs: Number(k.simulation.lastTickMs.toFixed(2)),
    ...k.mossRenderer.getStats(),
  };
}

export async function measurePlayback() {
  const k = window.koke;
  if (!k) throw new Error('KOKE is not ready');

  const gl = k.renderer.getContext();
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const previous = {
    running: k.simulation.running,
    pixelRatio: k.renderer.getPixelRatio(),
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    aspect: k.camera.aspect,
    representation: k.ui.state.representation,
    quality: k.ui.state.detail,
    surface: k.ui.state.surface,
    surfaceDetail: k.ui.state.surfaceDetail,
  };
  const records = [];

  k.effects.setEnabled(false);
  k.mossRenderer.setDew(false);
  k.setViewPreset('iso');
  k.renderer.setPixelRatio(1);
  k.renderer.setSize(1920, 1080, false);
  k.camera.aspect = 1920 / 1080;
  k.camera.updateProjectionMatrix();
  k.effects.resize(1920, 1080);
  document.getElementById('maturePresetBtn').click();

  try {
    for (const surface of SURFACES) {
      change('surfaceInput', surface);
      change('surfaceDetailInput', 'low');
      await wait(250);
      k.simulation.setRunning(true);

      for (const representation of REPRESENTATIONS) {
        k.mossRenderer.setRepresentation(representation);
        k.ui.state.representation = representation;
        for (const quality of QUALITIES) {
          k.mossRenderer.setQuality(quality);
          k.ui.state.detail = quality;
          records.push({ surface, representation, quality, ...(await sampleFrames(k)) });
        }
      }
    }

    k.simulation.setRunning(false);
    document.getElementById('barePresetBtn').click();
    k.mossRenderer.setRepresentation('shoots');
    k.mossRenderer.setQuality('high');
    await wait(250);
    await nextFrame();
    const bare = {
      ...k.mossRenderer.getStats(),
      drawCalls: k.renderer.info.render.calls,
      triangles: k.renderer.info.render.triangles,
    };

    return {
      capturedAt: new Date().toISOString(),
      gpu: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unavailable',
      browser: navigator.userAgent,
      drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
      pixelRatio: k.renderer.getPixelRatio(),
      sampleFrames: 45,
      records,
      bare,
    };
  } finally {
    k.simulation.setRunning(false);
    change('surfaceInput', previous.surface);
    change('surfaceDetailInput', previous.surfaceDetail);
    k.mossRenderer.setRepresentation(previous.representation);
    k.mossRenderer.setQuality(previous.quality);
    k.ui.state.representation = previous.representation;
    k.ui.state.detail = previous.quality;
    k.renderer.setPixelRatio(previous.pixelRatio);
    k.renderer.setSize(previous.width, previous.height, false);
    k.camera.aspect = previous.aspect;
    k.camera.updateProjectionMatrix();
    k.effects.resize(previous.width, previous.height);
    k.simulation.setRunning(previous.running);
  }
}

export async function prepareVisualReview(view = 'iso') {
  const k = window.koke;
  if (!k) throw new Error('KOKE is not ready');
  change('surfaceInput', 'faceted-rock');
  change('surfaceDetailInput', 'high');
  change('representationInput', 'shoots');
  change('detailInput', 'high');
  change('mossDensityInput', 0.5, 'input');
  document.getElementById('maturePresetBtn').click();
  k.setViewPreset(view);
  await wait(500);
  for (let i = 0; i < 8; i += 1) await nextFrame();
  return k.diagnostics.buildSnapshot();
}
