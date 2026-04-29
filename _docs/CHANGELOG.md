# CHANGELOG

## 2026-04-24
- Added multi-species moss simulation support (`Forest Moss`, `Rock Lichen`, `Velvet Moss`) with species-aware growth and habitat weighting.
- Implemented neighbor-driven species propagation so painted/seeded colonies spread naturally over time.
- Added interactive moss painting toolset (paint toggle, species picker, brush radius/strength, erase mode).
- Added spatial-indexed brush application in `simulation.js` to keep paint strokes performant on dense meshes.
- Upgraded renderer to species-aware tinting and instanced clump color variation by dominant local species.
- Added tests covering species habitat preference and brush seeding behavior.
- Tuned propagation to be calmer and less random by lowering baseline growth speed and introducing lifecycle state (`age`, `dormancy`) per cell.
- Added `mass` consolidation field and cohesion update to merge nearby colonies into larger continuous growth patches.
- Added species clump profiles so rendered growth forms differ by species without per-instance mesh allocations.
- Added viewport brush-radius preview ring for precise painting interaction.

## 2026-04-23
- Scaffolded Phase 1 Three.js application structure and entrypoint.
- Implemented scene initialization with orbit controls and directional/ambient lighting.
- Added surface analysis pipeline to compute slope, height normalization, light-facing values, and neighborhood graph.
- Implemented batched growth simulation with per-cell density/health updates and environmental influence.
- Added hybrid rendering with shader-based moss tint and preallocated instanced clumps.
- Added interactive controls for simulation playback, moisture, slope bias, light direction, and wireframe mode.
- Added Node-based unit tests for simulation helper behavior.
- Added docs baseline (`README`, `PRODUCT`, `ROADMAP`, `QA`, `DATA_MIGRATION`) and assumptions.
- Improved growth morphology with patch-based seeding and diffusion to reduce vertex-only colonization artifacts.
- Switched clump placement from per-vertex anchors to triangle barycentric sampling for more organic surface coverage.
- Added tokenized design system foundation (`design-tokens.css`) and reusable UI component layer (`components.css`).
- Added diagnostics component with live performance/simulation metrics and copyable debug snapshots.
- Added grouped control model for growth and performance tuning in `ui.js`.
- Advanced moss behavior with `colonization` and `gravityCreep` parameters for better spread character and runoff-influenced growth.
- Switched app styling to the shared `design-system/` package (`theme.css` + theme scripts) and removed app-local design-system source files.
- Added basic shell UX controls for `Start Sim`, `Pause Sim`, and theme selection.
- Replaced floating HUD layout with a cohesive DS-tokenized studio shell (topbar, side panels, center viewport card).
- Removed lil-gui dependency and rewired all controls through DS shell controls in `src/ui.js`.
- Added 3D view widget controls and camera view presets (`iso`, `front`, `top`, `left`).
- Added in-app snapshot preview plus export workflows for PNG and JSON diagnostics report.
- Optimized topbar UX to avoid stacking and moved non-persistent controls behind a DS-style `Settings` panel.
- Improved viewport shell sizing to scale with full screen width/height more reliably across breakpoints.
- Reduced UI jitter by enforcing stable metric typography/width and tightening topbar overflow behavior.
- Consolidated duplicate view controls into a single DS-style camera widget in the right utility panel.
- Improved settings panel spacing using DS compact row patterns and spacing tokens.
- Replaced floating settings popover with a rail-driven utility panel model to prevent overlap and group options by function.
- Fixed utility tab state handling so only the active rail panel is visible at a time.
- Updated topbar alignment to left-brand / center-actions and shifted action buttons to icon-first styling.
- Reworked camera widget buttons to explicit preset mapping and icon-based controls.
- Performed KataCart/Trekulate parity pass: centered topbar actions, explicit tab isolation (`is-active` + `hidden`), and unified utility rail behavior.
- Removed duplicate action surfaces by keeping non-run actions inside rail panels only.
- Updated utility controls toward icon-first treatment and aligned view widget layout to DS gizmo grid patterns.
- Switched KOKE from inline glyph symbols to Iconoir class-based icons, matching KataCart/Trekulate icon-system loading and usage.
