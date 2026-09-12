export function configurePointerControls(controls,mouse,canvas) {
  if(!controls?.mouseButtons||!mouse||!canvas?.addEventListener)throw new TypeError('Pointer controls require controls, mouse constants and a canvas');
  controls.mouseButtons.LEFT=-1;
  controls.mouseButtons.MIDDLE=mouse.PAN;
  controls.mouseButtons.RIGHT=mouse.ROTATE;
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  return {left:'tool',middle:'pan',right:'orbit',wheel:'zoom'};
}
