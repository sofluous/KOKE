# CHANGELOG

## 2026-09-11 - studio workflow
- Matched Bonsai's connected Object selector: Surface/Moss now form a flush full-width strip outside the scrolling controls. Removed redundant top-level panel-name headings while retaining rail tooltips and accessible labels.
- Refined the studio hierarchy around a top-level Object panel with Surface and Moss child tabs, following Bonsai's plant/vessel pattern. Moved external moisture/lighting to Scene and camera/quality/effects to Render.
- Consolidated moss growth, geometry, color mapping and painting under the Moss child panel. Added keyboard navigation for child tabs and fixed right-aligned form columns so control positions no longer depend on label length.
- Recorded the reviewed cross-project UI/model/render/export proposal in `STUDIO_PROPOSAL.md`, indexed it, and added Stage 1 acceptance checks and product/roadmap decisions.
- Delivered the compact left control rail, right Observation panel, Scene/Moss/Render/Export/Settings organization, balanced insets, collapsible panels and responsive drawers.
- Moved playback and capture below the viewport; added fixed-tick stepping, selected-preset restart, elapsed time and accurate fractional speed labels. Canvas/camera/effects resize when panels change.
- Added keyboard tab navigation, disclosure settings, overlay dismissal/focus restoration and focused desktop/mobile browser regression checks. No moss biology or geometry changes in this stage.
- Added selectable Rock, Sphere and faceted Icosahedron surfaces with independent substrate detail; surface changes preserve the radial growth field, rebuild surface-dependent data and anchors, and clear incompatible world-space spores.
- Added Surface mat, Flat triangles, Flat diamonds, Crossed cards, Low-poly clumps and Detailed shoots modes plus density, size, width and rotation variation controls.
- Added root/tip/stressed palettes and Uniform/Species/Health/Thickness/Moisture/Height mapping with range, inversion and texture controls. Added focused sampler, state-preservation, WebGL and triangle-budget checks.

## 2026-09-11
- Replaced the active color-only field path with validated, fixed-time growth on a shared radial rock surface; repaired default NaNs, mapping, species propagation, environmental updates, and statistics.
- Added persistent thickness, age, stress, dead material, dormant reserves, spatial carrying capacity, drought collapse, and species-preserving recovery.
- Built layered moss with a basal material, 1,500 stable cushion anchors, up to 60,000 shoot instances, species-dependent morphology, and directional/contact shadows.
- Added a deterministic 160-slot spore pool with flight, substrate landing, delayed germination, and diagnostics.
- Added Mature/Seed/Bare presets, playback/aging controls, fixed camera presets, macro view, optional dew and soft focus, lower detail, and effect-aware PNG capture.
- Added active-field/spore regressions and browser interaction/performance harnesses; preserved the existing uncommitted shell and legacy prototype work.

## 2026-09-10
- Audited the active moss field and renderer against four supplied visual references; documented numerical/mapping defects, missing geometry/lifecycle capabilities, and a staged improvement proposal in `data/MOSS_RENDERING_AUDIT_2026-09-10.md`.
- Added standalone diagnostic probes and captured results for the active field. Existing syntax checks and six legacy tests pass; browser/GPU visual verification remains outstanding. No production behavior changed.

## 2026-05-22
- Added project audit report at `_docs/data/AUDIT_2026-05-22.md` to document implementation drift, product-scope misalignment, and recommended realignment paths.
- Reframed KOKE product direction around an ambient growth simulation first, with moss painting moved to a later phase after visual validation.
- Rewrote `PRODUCT.md`, `ROADMAP.md`, and `QA.md` to align the project with the ambient-first MVP.
- Added `_docs/data/DIRECTION_2026-05-22_AMBIENT_FIRST.md` as a concise direction brief for the reset.
- Reworked the app shell to present an ambient review surface by default, moving growth, painting, and performance controls into a dedicated `Lab` tab while keeping scene review and capture actions immediately accessible.
- Corrected the shell toward a laboratory feel by restoring live observation metrics and event logging, removing excessive instructional copy, and making the simulation start from a paused ready state so `Start` has a clear effect.

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
- Implemented growth-map rendering phase: simulation now builds a low-res coverage texture (`density`, `mass`, `health`, `species`) consumed by shader as primary moss surface signal.
- Updated shader to sample neighboring map texels for bloom-like spread/merge/decay transitions, reducing sparse spotty polygon look.
- Reduced geometric dependence by making instanced clumps sparse macro detail only.
- Enhanced moss shader lifecycle readability with explicit spore/bloom/mature/decay/death phase blending from growth-map channels.
- Switched species tint source to map-driven species state and added species-specific grain/noise profiles for clearer tone/texture differences.
- Introduced a carpet-first refactor with `src/field-sim.js` and `src/field-renderer.js`.
- Replaced sparse clump-first dependency with a continuous field map simulation (species channels + vitality + wet paint) rendered directly in shader.
- Kept paint interaction but redirected strokes to texture-field deposition for liquid-to-bloom transitions.

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
