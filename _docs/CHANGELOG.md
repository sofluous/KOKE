# CHANGELOG

## 2026-10-22 - staged graph lifecycle uploads
- Split render-anchor lifecycle mapping into validated range copies and an explicit complete-revision commit while preserving the synchronous update contract.
- Added reusable simulation snapshots, 8,000-anchor scheduled lifecycle batches, partial GPU attribute update ranges and latest-revision coalescing.
- Filled pending High lifecycle buffers before swapping meshes, removing the final synchronous 60,000-anchor state copy.
- Added lifecycle progress, target revision, lag, maximum chunk duration and coalesced-update diagnostics.
- Added range-equivalence, validation, staged progress, partial-upload and stale-revision regressions.
- Recorded a repeat Chrome profile with a 10.8 ms largest High chunk, 2.1 ms largest lifecycle chunk and 33.4 ms Macro p95; the renderer trailed four to five revisions during sustained playback.
- Repeated all 13 Chrome graph-runtime assertions with zero final lifecycle lag and no reported console, runtime or shader errors.

## 2026-10-22 - chunked High-detail preparation
- Replaced the synchronous graph 30,000-to-60,000 expansion with deterministic 4,000-anchor work batches scheduled across animation frames.
- Kept Low geometry active until the complete High mesh is ready, then swapped atomically and disposed the previous GPU resources.
- Added preparation progress, elapsed time and maximum chunk duration to graph diagnostics, plus a readiness contract used by exact-detail exports.
- Added cancellation safety for replaced/disposed graph runtimes and batch-size-independent anchor-builder regressions.
- Reduced the near-limit High interaction from 100.8 ms blocking to 5.5 ms; preparation completes asynchronously with a 20.3 ms largest measured chunk.
- Repeated the 13-assertion Chrome runtime check with no reported console, runtime or shader errors.

## 2026-10-22 - near-limit graph performance baseline
- Added a reusable browser profile that generates a deterministic 9,350-triangle folded, apertured and disconnected GLB without storing a binary fixture.
- Measured import and Low construction, deferred High expansion, 1080p Cards and Detailed shoots, isolated simulation ticks, a full 160-spore pool and 5,000 forced BVH collision casts.
- Recorded Chrome 156 / Intel UHD 620 results and identified import latency, the 100.8 ms High transition and Macro shoot p95 spikes as the next optimization priorities.
- Fixed graph simulation playback so its `onStep` callback advances graph spores, matching the radial runtime contract, and added regression coverage.
- Added `graph-performance` support to the Chrome session runner and stored the full machine-readable profile under `_docs/data`.

## 2026-10-22 - progressive graph detail
- Changed graph imports to allocate 30,000 anchors at Low detail and expand once to 60,000 only when High geometric moss becomes visible.
- Made seeded area-weighted anchor sequences capacity independent so the Low attachment prefix remains unchanged after expansion.
- Applied the shared distance-sensitive detail curve to graph Detailed shoots without reducing cards, clumps or flat representations.
- Added allocated/max capacity and active LOD values to graph diagnostics and disposed the replaced Low instanced resources after expansion.
- Expanded regressions for stable prefixes, resource replacement and representation-specific LOD. All 36 automated tests and 13 Chrome integration assertions pass without reported errors.

## 2026-10-22 - coordinated general-model runtime
- Activated graph-backed GLB imports for open, folded, porous and disconnected triangle meshes in the existing Surface workflow.
- Added coordinated radial/graph runtime switching so simulation, rendering, painting, collision, spores, diagnostics, presets, species actions and export always address the selected model.
- Extended the graph renderer with shared surface/moss controls, bounded visible spore particles and revision-gated state uploads.
- Preserved imported biological state while switching to built-ins and back, and disposed replaced imported renderer/source resources only after replacement construction succeeds.
- Added an end-to-end Chrome regression for GLB import, face identity, painting, representation changes, state restoration and shader compilation. Syntax checks and all 36 automated tests pass; all eight Chrome assertions pass without reported errors.

## 2026-10-20 - graph spore collision
- Added a topology-general spore simulation with a fixed bounded pool, mature-face release, ballistic flight, exact landing identity and delayed species-preserving germination.
- Added a reusable triangle BVH with bounded segment queries and nearest two-sided triangle intersection.
- Added graph-simulation germination with habitat, moisture and occupancy checks plus lifecycle diagnostics.
- Added nearest-layer, miss, pool-bound, landing and lineage regressions. Production syntax checks and all 36 automated tests pass.

## 2026-10-20 - graph renderer integration
- Added a Three.js-compatible graph renderer joining arbitrary mesh geometry, graph lifecycle state, stable anchors and collision identity.
- Added lifecycle-colored continuous surface rendering plus triangle, diamond, card, clump and detailed-shoot instancing.
- Retained Low/High 30,000/60,000 budgets, density controls and species width/height morphology without rebuilding stable transforms.
- Added revision-gated typed-array uploads, renderer diagnostics, validation and disposal.
- Added a focused renderer harness. Production syntax checks and all 35 automated tests pass.

## 2026-10-04 - mesh raycast collision
- Added a mesh collision adapter that resolves Three.js-compatible ray hits into graph triangle, barycentric, component, local/world point, normal and distance data.
- Added import-time validation that geometry face order matches welded graph triangle order before a general GLB result is accepted.
- Connected resolved hits to graph biological painting through one explicit adapter method.
- Added transformed-hit, barycentric, disconnected-painting and invalid-identity regressions. Production syntax checks and all 34 automated tests pass.

## 2026-10-04 - face-index graph painting
- Added biological paint and erase operations seeded by mesh face index and propagated by graph-surface distance.
- Painting carries the selected species, moisture and vitality; erasing reduces living species, dormant reserves, biomass and dead matter.
- Reused one shared bounded graph traversal for scalar and biological brushes, retaining disconnected-component isolation.
- Added mutation revisions and paint-operation diagnostics plus focused brush and validation regressions.

## 2026-10-04 - stable mesh render anchors
- Added deterministic area-weighted render anchors with triangle, barycentric, component, position, normal, tangent-frame and variation buffers.
- Excluded degenerate triangles from attachment selection and capped allocation at 100,000 anchors.
- Added a revision-aware state sampler that maps all graph lifecycle channels into reusable per-anchor buffers and derives density and dominant species.
- Kept the new contract isolated from the active radial renderer and UI pending face-index painting, mesh collision and final renderer integration.
- Added focused attachment, distribution, orientation, state-mapping and validation regressions. Production syntax checks and all 33 automated tests pass.

## 2026-10-02 - graph-backed simulation adapter
- Added a topology-general simulation adapter with per-triangle species, vitality, moisture, biomass, age, stress, dormant-reserve and dead-matter state.
- Added deterministic mature, seed and bare initialization; shared-edge lifecycle propagation; drought collapse; dormant recovery; species conversion; area-weighted statistics; and frame-rate-independent fixed stepping.
- Extracted fixed-step and environment defaults/validation into a neutral shared module used by both radial and graph simulations.
- Kept the adapter outside the renderer, interaction, spore and product UI paths pending their staged deliveries.
- Added focused lifecycle, component-isolation, validation and fixed-time regressions. Production syntax checks and all 32 automated tests pass.

## 2026-10-02 - mesh surface-graph prototype
- Added a topology-general mesh graph with vertex welding, shared-edge adjacency, connected components, topology diagnostics and deterministic area-weighted surface samples.
- Added a prototype scalar graph field with adjacency-following painting and propagation that cannot cross disconnected surfaces.
- Split general `importMeshGraphGlb` extraction from the production `importRadialGlb` validation path; successful radial imports now retain graph metadata and show component counts.
- Added a folded/disconnected regression fixture. All 31 automated tests pass.

## 2026-10-02 - species-specific moss geometry
- Added explicit render profiles to Cushion, Sheet and Feather moss and passed them from the biological catalog into the active instanced renderer.
- Added species-weighted shoot width, height, lateral creep, canopy spread, clump proportions and microtexture scale without adding draw calls or geometry.
- Tuned Sheet moss after deterministic visual review so its low continuous carpet dominates over cushion bases.
- Added a morphology contract regression and matched Chrome captures. All 30 automated tests pass and all three shaders render without reported errors.

## 2026-10-01 - adaptive detailed-shoot LOD
- Added smooth distance-sensitive instance counts for Detailed shoots, retaining full macro density and reducing overview counts to a 45% floor without rebuilding geometry.
- Added an enabled-by-default Adaptive shoots switch under Render; disabling it restores the exact manual Low/High and Density budget.
- Exposed camera distance, LOD factor and adaptive state in renderer diagnostics while leaving cards, clumps and simulation state unchanged.
- Added a focused unit regression and Chrome behavior check. All 29 automated tests and five browser assertions pass.

## 2026-09-26 - Chrome visual tuning and performance baseline
- Rebalanced colony width and height, reduced cushion footprints, and added seeded low-amplitude silhouette deformation to reduce repetitive spherical clumps without adding geometry.
- Raised default Colony variation to 0.85 and Patchiness to 0.70 after deterministic overview and macro review.
- Expanded the Chrome performance probe to a repeatable 24-case matrix at a fixed 1920 x 1080 drawing buffer and recorded full results, summary and captures under `_docs/data`.
- Confirmed bare Detailed shoots collapse to the three-call substrate path; measured Detailed shoots as the next performance target on Intel UHD 620.

## 2026-09-26 - organic colonies and reduced update cost
- Added Colony variation and Patchiness controls that vary seeded colony proportions and per-shoot emergence thresholds without adding geometry.
- Added a stable tangent fallback for shoot orientation near radial poles.
- Suppressed clump and shoot draws for bare fields and exposed shoot allocation/geometry visibility in renderer diagnostics.
- Added spore revision tracking so particle buffers upload only after visible particle changes, including no uploads for an idle empty pool.
- Throttled full simulation-stat collection and diagnostics DOM updates to 4 Hz while retaining continuous frame smoothing and simulation timing.
- Production syntax checks and all 28 automated tests pass.

## 2026-09-12 - pointer mapping and progressive moss allocation
- Reserved left mouse drag for the active interaction tool, remapped middle drag to pan/track and right drag to orbit, retained wheel zoom, and suppressed the viewport context menu.
- Added a viewport interaction tooltip and a focused pointer-mapping regression test.
- Reduced low-detail startup allocation to 30,000 shoot instances with a lightweight hidden placeholder; the 60,000-instance tier is created only when High detail and visible moss geometry require it.
- Added session-seeded stratified variation to colony, shoot and dew anchors to reduce regular placement patterns while retaining even global coverage.
- All 28 automated tests pass.

## 2026-09-12 - surfaces, GLB import and painting tools
- Added Faceted Rock, Ellipsoid and Rounded Cube alongside Rock, Sphere and Icosahedron. Rock deformation is driven by the session seed and a user control; faceted surfaces use lower tessellation budgets.
- Added substrate base/accent colors, five procedural texture styles, texture scale/variation and roughness without changing biological field state.
- Added self-contained GLB import for closed star-shaped models up to 10,000 triangles, with centering, normalization, radial-coverage validation and a cached sampler shared by simulation and rendering.
- Moved Brush and Eraser into a centered rail tool group and moved radius/strength into a dedicated tool panel, removing painting controls from the Moss panel.
- Added built-in surface, seeded deformation and radial mesh validation tests; all 27 automated tests pass.

## 2026-09-12 - initialization and image export
- Changed startup to a paused low-detail Sphere with the continuous Surface mat and Low render detail, and capped paused rendering at 15 fps, reducing initial geometry and idle GPU cost while leaving richer modes available on demand.
- Added a random unsigned 32-bit seed per launch for colony placement, habitat capacity and lifecycle variation. Session restarts retain the seed, URL seed replay is supported, and reports record it in UI state.
- Added dimension presets and custom image sizes, aspect locking, PNG/JPEG/WebP, transparency, quality, output detail and view-effect controls.
- Added exact-size capture with GPU/pixel limit validation and restoration of camera, viewport, effects, moss quality, dew and playback state after export.
- Added focused seed and export-setting regression tests; all 25 automated tests pass.

## 2026-09-11 - studio workflow
- Added Cushion Moss, Sheet Moss and Feather Moss as meaningful biological profiles affecting habitat, lifecycle, spread, spores, color and renderer morphology.
- Added one moss-type selector for painting and starting presets, plus explicit `Convert existing` and `Reseed scene` actions. Conversion preserves field history and biomass; both operations clear incompatible in-flight spores.
- Anchored all panel content to the top with consistent section gaps so shorter tabs no longer distribute controls over the full panel height.
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
