import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createViewEffects(renderer, scene, camera, controls) {
  let composer, bokeh;
  let enabled = false;
  return {
    isEnabled() { return enabled; },
    setEnabled(value) {
      enabled = Boolean(value);
      if (enabled && !composer) {
        composer = new EffectComposer(renderer);
        const samples = Math.min(4, renderer.getContext().getParameter(renderer.getContext().MAX_SAMPLES));
        composer.renderTarget1.samples = samples;
        composer.renderTarget2.samples = samples;
        composer.addPass(new RenderPass(scene, camera));
        bokeh = new BokehPass(scene, camera, { focus: 4, aperture: 0.0006, maxblur: 0.006 });
        composer.addPass(bokeh);
        composer.addPass(new OutputPass());
      }
    },
    resize(width, height) { composer?.setSize(width, height); },
    render() {
      if (enabled) {
        bokeh.uniforms.focus.value = camera.position.distanceTo(controls.target);
        composer.render();
      } else renderer.render(scene, camera);
    },
  };
}
