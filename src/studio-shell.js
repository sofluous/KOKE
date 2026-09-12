export function createStudioShell() {
  const root = document.getElementById('studio');
  const body = document.getElementById('controlBody');
  const observation = document.getElementById('observationPanel');
  const tabs = Array.from(document.querySelectorAll('[data-utility-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-utility-panel]'));
  const toolPanels = Array.from(document.querySelectorAll('[data-tool-panel]'));
  const objectTabs = Array.from(document.querySelectorAll('[data-object-tab]'));
  const objectPanels = Array.from(document.querySelectorAll('[data-object-panel]'));
  const controlsButton = document.getElementById('controlsToggleBtn');
  const observationButton = document.getElementById('observationToggleBtn');
  const backdrop = document.getElementById('panelBackdrop');
  const small = matchMedia('(max-width: 760px)');
  const medium = matchMedia('(max-width: 1100px)');
  let controlsOpen = !small.matches;
  let observationOpen = !medium.matches;

  function sync() {
    root.classList.toggle('controls-collapsed', !controlsOpen);
    root.classList.toggle('observation-collapsed', !observationOpen);
    body.hidden = !controlsOpen;
    observation.hidden = !observationOpen;
    controlsButton.setAttribute('aria-controls', 'controlBody');
    controlsButton.setAttribute('aria-expanded', String(controlsOpen));
    observationButton.setAttribute('aria-controls', 'observationPanel');
    observationButton.setAttribute('aria-expanded', String(observationOpen));
    document.getElementById('controlsVisibleInput').checked = controlsOpen;
    document.getElementById('observationVisibleInput').checked = observationOpen;
    backdrop.hidden = !(small.matches && controlsOpen || medium.matches && observationOpen);
  }
  function showControls(value) {
    if (!value && body.contains(document.activeElement)) controlsButton.focus();
    controlsOpen = value;
    if (value && small.matches) observationOpen = false;
    sync();
  }
  function showObservation(value) {
    if (!value && observation.contains(document.activeElement)) observationButton.focus();
    observationOpen = value;
    if (value && small.matches) controlsOpen = false;
    sync();
  }
  function setTab(name, open = true) {
    const next = tabs.some(t => t.dataset.utilityTab === name) ? name : 'object';
    tabs.forEach(tab => {
      const active = tab.dataset.utilityTab === next;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.utilityPanel !== next; });
    toolPanels.forEach(panel=>{panel.hidden=true;});
    if (open) showControls(true);
  }
  function setToolPanel(name) {
    const found=toolPanels.some(panel=>panel.dataset.toolPanel===name);if(!found)return;
    panels.forEach(panel=>{panel.hidden=true;});
    toolPanels.forEach(panel=>{panel.hidden=panel.dataset.toolPanel!==name;});
    tabs.forEach(tab=>{tab.classList.remove('is-active');tab.setAttribute('aria-selected','false');});
    showControls(true);
  }
  function setObjectTab(name) {
    const next=objectTabs.some(tab=>tab.dataset.objectTab===name)?name:'surface';
    objectTabs.forEach(tab=>{const active=tab.dataset.objectTab===next;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    objectPanels.forEach(panel=>{panel.hidden=panel.dataset.objectPanel!==next;});
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setTab(tab.dataset.utilityTab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault(); tabs[next].focus(); setTab(tabs[next].dataset.utilityTab);
    });
  });
  objectTabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>setObjectTab(tab.dataset.objectTab));
    tab.addEventListener('keydown',event=>{
      let next;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%objectTabs.length;
      if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index+objectTabs.length-1)%objectTabs.length;
      if(event.key==='Home')next=0;if(event.key==='End')next=objectTabs.length-1;if(next===undefined)return;
      event.preventDefault();objectTabs[next].focus();setObjectTab(objectTabs[next].dataset.objectTab);
    });
  });
  controlsButton.addEventListener('click', () => showControls(!controlsOpen));
  observationButton.addEventListener('click', () => showObservation(!observationOpen));
  document.getElementById('observationCloseBtn').addEventListener('click', () => showObservation(false));
  document.getElementById('controlsVisibleInput').addEventListener('change', e => showControls(e.target.checked));
  document.getElementById('observationVisibleInput').addEventListener('change', e => showObservation(e.target.checked));
  const details = document.getElementById('diagnosticDetails');
  const diagnosticInput = document.getElementById('diagnosticsVisibleInput');
  diagnosticInput.addEventListener('change', () => { details.open = diagnosticInput.checked; });
  details.addEventListener('toggle', () => { diagnosticInput.checked = details.open; });
  function dismiss() {
    if (small.matches && controlsOpen) showControls(false);
    if (medium.matches && observationOpen) showObservation(false);
  }
  backdrop.addEventListener('click', dismiss);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') dismiss(); });
  small.addEventListener('change', () => showControls(!small.matches));
  medium.addEventListener('change', () => showObservation(!medium.matches));
  setObjectTab('surface');setTab('object', false); sync();
  return { setTab, setObjectTab, setToolPanel };
}
