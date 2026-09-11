// Run via browser-session.mjs at desktop and narrow viewport sizes.
export async function runStudioChecks() {
  const passed = [], k = window.koke;
  const check = (ok, label) => { if (!ok) throw new Error(label); passed.push(label); };
  const el = id => document.getElementById(id);
  const click = id => el(id).click();
  const wait = () => new Promise(resolve => setTimeout(resolve, 200));
  const narrow = innerWidth <= 760;
  check(document.documentElement.scrollWidth === innerWidth, 'no horizontal page overflow');
  click('tab-moss');
  check(!el('panel-moss').hidden && el('panel-scene').hidden, 'tabs select one panel');
  el('tab-moss').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  check(document.activeElement === el('tab-render') && el('tab-render').getAttribute('aria-selected') === 'true', 'keyboard navigation updates focus and selection');
  const rail = document.querySelector('.koke-utility-rail').getBoundingClientRect();
  const button = el('tab-scene').getBoundingClientRect();
  check(Math.abs((button.left - rail.left) - (rail.right - button.right)) <= 1, 'rail buttons have balanced horizontal spacing');
  click('seedPresetBtn'); click('simStepBtn');
  check(k.simulation.totalTicks === 1 && !k.ui.state.playing && el('elapsedTime').textContent === '00:00.05', 'step advances exactly one fixed tick while paused');
  click('simPlayBtn'); await new Promise(resolve => setTimeout(resolve, 600)); click('simPlayBtn');
  check(k.simulation.totalTicks > 1, 'play advances simulation');
  const ticks = k.simulation.totalTicks; await wait();
  check(k.simulation.totalTicks === ticks, 'pause freezes simulation');
  const speed = el('playbackSpeedInput');
  speed.value = '0.25'; speed.dispatchEvent(new Event('input', { bubbles: true }));
  check(k.ui.state.playbackSpeed === 0.25 && el('playbackSpeedValue').textContent === '0.25x', 'fractional playback speed retains precision');
  speed.value = '1'; speed.dispatchEvent(new Event('input', { bubbles: true }));
  click('simRestartBtn');
  check(k.simulation.totalTicks === 0 && k.ui.state.initialState === 'seed' && el('elapsedTime').textContent === '00:00.00', 'restart retains selected initial state and resets time');
  const width = el('viewport').getBoundingClientRect().width;
  click('controlsToggleBtn'); await wait();
  check(el('controlBody').hidden && (narrow || el('viewport').getBoundingClientRect().width > width), 'collapse hides controls and reclaims desktop viewport space');
  const viewport = el('viewport').getBoundingClientRect();
  check(Math.abs(k.camera.aspect - viewport.width / viewport.height) < 0.001 && k.simulation.totalTicks === 0 && k.ui.state.initialState === 'seed', 'panel resize updates camera without resetting simulation state');
  click('tab-settings');
  check(!el('controlBody').hidden, 'rail restores collapsed controls');
  el('diagnosticsVisibleInput').click(); await wait();
  check(el('diagnosticDetails').open, 'settings controls diagnostic disclosure');
  if (narrow) {
    click('observationToggleBtn');
    check(!el('observationPanel').hidden && el('controlBody').hidden, 'narrow layout opens only one panel');
    const r = el('simPlayBtn').getBoundingClientRect();
    check(el('simPlayBtn').contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)), 'transport remains accessible with overlay open');
    el('observationCloseBtn').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    check(el('observationPanel').hidden && document.activeElement === el('observationToggleBtn'), 'Escape dismisses overlay and restores focus');
  }
  click('captureBtn');
  check(el('snapshotThumb').src.startsWith('data:image/png') && !el('panel-export').hidden, 'capture creates image and opens Export');
  click('maturePresetBtn'); click('tab-scene');
  if (narrow) click('controlsToggleBtn');
  return { viewport: [innerWidth, innerHeight], passed };
}
