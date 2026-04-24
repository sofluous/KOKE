# QA

## Risks reviewed
- Regression risk: simulation loop and render loop coupling.
- Performance risk: CPU spikes from full-vertex updates.
- Stability risk: geometric adjacency correctness for growth propagation.

## Mitigations
- Fixed simulation cadence (`tickEveryFrames`) to decouple from render FPS.
- Batched simulation updates (`batchRatio`).
- Coverage updates flow through fixed-size typed arrays and a preallocated `InstancedMesh`.

## Test checklist
- `npm run check` passes.
- `npm test` passes.
- Browser run validates:
  - cohesive DS shell layout renders correctly on desktop and mobile breakpoints
  - orbit controls and lighting work
  - growth visibly evolves over time with contiguous patches (not vertex-only dots)
  - growth controls work (`moisture`, `slopeBias`, `growthRate`, `decayRate`, `diffusionRate`, `colonization`, `gravityCreep`)
  - performance controls work (`tickEveryFrames`, `batchRatio`)
  - paint tools work (enable paint, select species, adjust radius/strength, erase mode)
  - painted seeds propagate naturally over subsequent simulation ticks
  - light/playback/wireframe controls work
  - view preset widget buttons move camera correctly (`iso`, `front`, `top`, `left`)
  - shell controls work (`Start Sim`, `Pause Sim`, theme selector)
  - header remains compact without overflow stacking at common desktop widths
  - `Settings` button routes to the utility rail settings tab (no floating overlap)
  - settings panel spacing remains readable and token-aligned (`ds-field-row-compact`, DS spacing tokens)
  - camera/view controls are grouped in a single right-panel widget (not duplicated across header/viewport/toolbars)
  - theme changes apply through shared `design-system` scripts and persist via storage key
  - diagnostics panel updates and report copy succeeds on localhost/secure context
  - snapshot preview populates and both export actions work (PNG + JSON report)

## Notes
- No lint config exists in this phase; no lint command executed.
