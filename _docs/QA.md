# QA

## Surface-first graph allocation verification - 2026-10-28
Renderer regressions verify zero anchors and instances in initial Surface mode, on-demand Low preparation, a Low request upgraded to High before completion, readiness across the follow-up build, final requested instance count and cancellation when the user returns to Surface. Chrome passed all 14 graph-runtime assertions: painting updated Surface colors without anchors, hidden High retained zero anchors, and switching to Cards created 60,000 anchors carrying the previously painted lifecycle state. No console, runtime or shader errors were reported.

The repeat 9,350-triangle profile recorded zero initial anchors, 188.9 ms import, 357.5 ms direct High readiness, a 7.6 ms control interaction and a 10.1 ms largest preparation chunk. The previous staged-lifecycle run recorded 30,000 initial anchors and 275 ms import. Browser heap snapshots and 45-frame samples varied substantially between runs, so no retained-memory or frame-rate claim is made. Surface mode now performs no per-anchor allocation by construction; geometric modes still retain the fixed 30,000/60,000 ceilings once requested.

## Model-aware imported-default verification - 2026-10-28
Graph regressions cover the 4.4-unit reference sphere, disconnected-component isolation, lower and upper clamps, invalid component identity and scale propagation into renderer diagnostics and spore size. The renderer rejects nonpositive automatic factors. All 36 automated tests and production syntax checks pass. Chrome passed all 14 graph-runtime assertions with resolved scales of 0.65 for moss and 0.564 for the test model's brush, zero final lifecycle lag and no reported console, runtime or shader errors.

The calculation is linear in graph triangles plus components and runs once per successful import. It adds no per-frame work or new allocation proportional to render-anchor count. Source units cannot be recovered after normalization, so the factors describe normalized visual scale rather than real organism dimensions. Largest-component area is robust to small disconnected debris, but an asset made of many equally small independent pieces will intentionally size moss for one piece; representative user-model review remains necessary.

## Staged lifecycle verification - 2026-10-22
Anchor-state regressions compare arbitrary range copies plus an explicit revision commit with the original complete update across every lifecycle channel. Renderer regressions verify bounded progress, scalar and species update ranges, final revision parity and replacement of queued stale revisions. Invalid anchor ranges fail before mutation.

The repeat 9,350-triangle Chrome profile completed without console, runtime or shader errors. High interaction took 6.6 ms, full readiness took 370.6 ms and the largest preparation chunk was 10.8 ms, down from the prior 20.3 ms final chunk. Recurring lifecycle work peaked at 2.1 ms. Cards and adaptive Isometric shoots measured 16.8 ms p95; Macro Detailed shoots measured 33.4 ms p95 versus 50 ms in the original baseline. The separate graph-runtime pass retained all 13 integration assertions and converged to zero lifecycle lag after painting and High expansion.

Lifecycle rendering is intentionally eventually consistent during continuous playback. The sampled renderer was four revisions behind after Cards and Macro runs and five behind after overview shoots; 43 superseded revisions had been coalesced by the final sample. Painting and stopped simulation converge to the latest complete revision through the same queue. These short frame samples vary between runs, so the chunk timers and lag counters are the direct evidence for this change; Macro geometry and overdraw still need representative-device review.

## Chunked High-detail verification - 2026-10-22
Anchor-builder regressions verify that arbitrary batch sizes produce exactly the same position, frame, barycentric, triangle, component and variation buffers as synchronous generation. Renderer regressions cover Low visibility during preparation, deterministic High completion, prior-resource disposal, duplicate-request reuse and cancellation when a renderer is replaced. High-resolution export now awaits graph readiness. All 36 automated tests and production syntax checks pass.

The repeated 9,350-triangle Chrome profile reported a 5.5 ms High-control interaction, 425.3 ms elapsed preparation and a 20.3 ms largest chunk. The previous implementation blocked for 100.8 ms. The final 60,000-anchor layout, 30,000 visible Cards at 0.5 density and shader status remained correct. The focused three-face runtime check passed all 13 assertions with an 11 ms largest chunk and no console, runtime or shader errors.

Chunking trades immediate High completion for responsiveness: users continue seeing the Low allocation during preparation. The later staged-lifecycle pass removes the final full state copy and reduces the measured maximum to 10.8 ms. Import and frame timings vary between these short profiles; directly instrumented interaction, elapsed preparation, chunk duration and lifecycle-lag values provide the strongest comparison.

## Near-limit graph performance verification - 2026-10-22
The reusable Chrome harness generates and imports a 9,350-triangle GLB with folded relief, repeated openings and 100 disconnected islands. Import reports 5,241 welded vertices, 101 components, 980 boundary edges, no non-manifold edges and no degenerate triangles. It runs at a fixed 1920 x 1080 drawing buffer with effects disabled and records browser, GPU, topology, allocation, heap, draw, simulation, spore and collision data. No source asset or uploaded model is required.

Chrome 156 on Intel UHD 620 completed the profile without console, runtime or shader errors. Import plus Low construction took 417.5 ms and increased reported JS heap by about 12.4 MB. High expansion took 100.8 ms and reported a further 19.6 MB before garbage collection. High Cards at 30,000 instances measured 16.7 ms median / 16.8 ms p95; Macro shoots at 30,000 measured 16.7 / 50 ms; adaptive Isometric shoots at 14,665 measured 16.7 / 16.8 ms. Short headless samples can contain scheduler effects, so the Macro spike is an optimization signal rather than a universal rate.

Thirty simulation ticks measured 2.8 ms median / 5.2 ms p95. Forty spore steps with all 160 particles active measured 1.4 / 2.1 ms, with the pool still full after two simulated seconds. All 5,000 forced triangle-crossing BVH casts hit and completed in 33.1 ms total, or 0.00662 ms each. Profiling also exposed and fixed a missing `onStep` callback in the graph simulation; normal graph playback now advances its attached spore system, with a focused regression covering the callback.

## Progressive graph detail verification - 2026-10-22
Production syntax checks and all 36 automated tests pass. Anchor regressions verify that a smaller seeded allocation is the exact prefix of a later larger allocation across positions, frames, barycentric coordinates, triangle/component identity and variation. Renderer tests verify Low capacity, one-time High expansion, prior GPU-resource disposal, state refresh on the replacement buffers, Detailed-shoot distance reduction, manual restoration and no distance reduction for Cards.

Chrome passed 13 coordinated-runtime assertions with no console, runtime or shader errors. A Low import allocated 30,000 anchors. Selecting High while Surface remained active did not expand hidden geometry; selecting Cards expanded to 60,000 and preserved the sampled Low prefix. At High detail and 0.5 density, Detailed shoots used 30,000 instances at the 3.66-unit Macro distance and 14,665 at the 9.03-unit Isometric distance. Cards remained at 30,000.

The change halves initial graph anchor, transform and lifecycle-buffer allocation relative to the previous 60,000-anchor import path. High still performs a one-time replacement allocation and transform build; measured transition time and peak memory remain open. The tiny three-face GLB validates integration but is not evidence for simulation or collision performance near the 10,000-triangle limit.

## Coordinated general-model runtime verification - 2026-10-22
Production syntax checks and all 36 automated tests pass. The new browser regression imports an in-memory GLB with connected open faces and a nearby disconnected face, confirms the graph simulation and renderer retain all three source faces, validates collision face order, paints biological state into the matching render buffer, switches the existing representation control, changes to a built-in Sphere and restores the imported runtime without losing its state.

Chrome completed all eight assertions with no console, runtime or shader-program errors. The focused Low-detail Cards case reported three graph cells, two connected components, 15,000 visible instances, four draw calls and 60,005 triangles. This is a functional check rather than a representative performance benchmark; the tiny fixture still owns 60,000 stable anchors because the graph renderer currently preallocates the High ceiling. Representative folded/porous models near the 10,000-triangle import limit and sustained spore traffic remain to be measured before performance claims are made.

Invalid GLB structure, excessive triangle counts and geometry/graph face disagreement still fail before activation. Replacement construction is completed before the previous imported runtime is disposed. Imported files remain local to the browser session; no model data is uploaded or persisted. No new package, network or HTML-injection surface was introduced.

## Graph spore verification - 2026-10-20
Production syntax checks and all 36 automated tests pass. The regression verifies that the BVH segment collider returns the nearest of two close disconnected layers with normalized barycentric identity, misses segments outside the mesh, and ignores zero-length segments. A bounded graph-spore pool releases the dominant species, lands through the collider, preserves barycentric event data and germinates the same species on the landed face after its delay.

Invalid capacities, release faces, step durations, BVH leaf sizes and dry germination are rejected or safely declined. BVH construction scales with imported triangle count and occurs once; flight queries traverse intersected bounds and leaf triangles rather than scanning every face. Browser performance with the full 160-particle pool remains to be measured during general-model activation.

## Graph renderer verification - 2026-10-20
Production syntax checks and all 35 automated tests pass. A Three.js-compatible renderer harness verifies stable anchor allocation, initial lifecycle upload, no upload for an unchanged revision, updated species and density buffers after graph painting, continuous surface-color updates, all representation transitions, density and quality instance budgets, shader attribute injection, validation and complete disposal.

The renderer allocates 30,000 anchors and instance transforms at Low and can expand once to 60,000 at High. Lifecycle refresh scales with allocated anchor capacity times three species, while face color refresh scales with imported triangle count; both run only after simulation revision changes. The later coordinated-runtime and progressive-detail checks close initial shader and browser integration risk. Actual draw cost and visual quality on representative folded GLBs remain open.

## Mesh collision verification - 2026-10-04
Production syntax checks and all 34 automated tests pass. The collision regression validates face-order agreement between expanded geometry and the welded graph, resolves a translated world-space hit to the expected triangle and barycentric coordinates, reconstructs its local and world points, and connects that hit to biological graph painting. The brush reaches the connected neighbor while the nearby disconnected face remains empty.

Mismatched vertex order, foreign mesh hits, invalid face indices and points outside the reported triangle are rejected. Import validation is linear in source triangle count and runs once per GLB, within the existing 10,000-triangle limit. The later 2026-10-22 coordinated-runtime check closes the initial browser integration risk with a generated GLB; complex representative user assets remain a separate visual and performance check.

## Face-index painting verification - 2026-10-04
The graph adapter regression now paints the four-triangle folded component from one face with a large brush while both nearby disconnected triangles remain empty. A subsequent local erase reduces the seeded species, and diagnostics report both successful operations. Invalid face indices, zero radius and out-of-range strength are rejected. These checks run within the 33-test suite and share the graph traversal already covered by the scalar painting regression.

Face identity is now enforced by import-time geometry/graph validation and the collision adapter. A real imported-model browser check remains pending with graph-renderer integration.

## Mesh render-anchor verification - 2026-10-04
Production syntax checks and all 33 automated tests pass. The focused regression verifies deterministic seeded anchors, different placement from different seeds, barycentric reconstruction against the source graph, unit and mutually perpendicular normal/tangent frames, component identity, area-proportional distribution across disconnected components, exclusion of zero-area triangles and bounded anchor counts.

The state sampler verifies exact per-triangle transfer of species and lifecycle values to every attached anchor, derived density and dominant species, revision-based update skipping and rejection of simulation state from another graph. Generation costs scale with anchor count times a binary search over usable triangles; state refresh costs scale with anchors times species count. Buffers are preallocated and capped at 100,000 anchors. Browser frame-time and GPU upload costs remain unresolved because this contract is deliberately outside the active renderer.

## Graph simulation adapter verification - 2026-10-02
Production syntax checks and all 32 automated tests pass. The adapter regression verifies the complete semantic channel contract and array dimensions, propagation around a folded component without transfer to a nearby disconnected sheet, biomass and age preservation during species conversion, drought-created dormant reserves and dead matter, moisture-driven recovery without species contamination, deterministic seeded evolution, and identical fixed-time results at 30, 60 and 120 fps.

Inputs reject invalid graphs, seeds, environment values, light directions, species identifiers and step durations. State is finite after the exercised lifecycle runs. Per-step work scales with triangle and shared-edge counts and uses preallocated typed arrays; at the current 10,000-triangle import limit this remains an isolated CPU path and has not yet received browser frame-time profiling. Renderer attachment, face-index brush input and mesh spores now consume the contract; active general-model import remains outside this verification.

## Mesh surface-graph prototype verification - 2026-10-02
Production syntax checks and all 31 tests pass. Chrome 153 also loads the application with the graph module on the static import path without browser, console or shader errors. The folded fixture contains a four-triangle right-angle strip and a second two-triangle sheet only 0.04 units away. The graph reports two components and the expected shared-edge chain. A full-radius brush changes all four connected triangles and neither nearby disconnected triangle; forty diffusion steps reach the end of the folded component while the second sheet stays exactly zero. Indexed and expanded geometry produce the same component and welded-vertex counts.

The graph validates finite positions, indices, triangle limits, weld tolerance, barycentric locations, sample seeds, brush settings and field rates. It reports boundaries, non-manifold edges and degenerates rather than silently treating them as closed manifold topology. Current limitations are deliberate: one biological cell per source triangle makes resolution tessellation-dependent; centroid path lengths approximate geodesic distance; graph state does not yet feed the renderer, pointer tools or spores.

## Species morphology verification - 2026-10-02
Production syntax checks and all 30 tests pass. The morphology regression verifies that every species exposes a complete positive finite render profile and preserves the intended geometric relationships: Sheet is broader, lower and more lateral than Cushion; Feather is narrower, taller and finer. Chrome 153 compiled the revised surface and depth shaders without browser, console or shader errors.

Deterministic Macro captures use the same seed, mature field, camera, High detail, density 0.5 and disabled adaptation: [Cushion](data/MORPH_CUSHION_2026-10-02.png), [Sheet](data/MORPH_SHEET_2026-10-02.png), and [Feather](data/MORPH_FEATHER_2026-10-02.png). Each reports 30,000 shoots, five draw calls and 363,710 triangles. Visual differences therefore come from profile-driven vertex transforms rather than extra geometry. The final Sheet pass was reduced after review so its continuous carpet dominates instead of enlarged round cushion bases.

## Adaptive shoot-detail verification - 2026-10-01
Production syntax checks and all 29 tests pass. The new unit check verifies finite inputs, range validation, endpoint clamping and monotonic smooth reduction. A focused Chrome 153 check passed five assertions with no browser or shader errors: Macro retained 30,000 shoots at distance 3.66; Isometric reduced them to 14,665 at distance 9.03; disabling adaptation restored 30,000; Crossed cards remained at 30,000; and all compiled GPU programs remained runnable. See [the browser result](data/LOD_BROWSER_CHECK_2026-10-01.json).

The feature changes the active instance range and leaves the 60,000-slot High allocation available, avoiding allocation churn while orbiting or zooming. It therefore reduces vertex and fragment work rather than peak memory. The minimum factor is intentionally conservative at 45%; visual review on other hardware may justify different distance thresholds later.

## Chrome visual and performance review - 2026-09-26
Chrome 153 compiled and rendered the revised shaders without runtime, console or shader errors. The deterministic Faceted Rock overview and macro captures were reviewed after tuning; broader colonies are flatter, smaller colonies retain height, cushion footprints are reduced, and exposed substrate remains readable. Artifacts: [overview](data/VISUAL_OVERVIEW_2026-09-26.png), [macro](data/VISUAL_MACRO_2026-09-26.png), [full measurements](data/PERFORMANCE_2026-09-26.json), and [review summary](data/PERFORMANCE_REVIEW_2026-09-26.md).

The fixed 1920 x 1080 run used Chrome 153 and Intel UHD 620 with effects and dew disabled, a mature field, density 0.5, and active simulation. Twenty-four combinations covered Sphere, Faceted Rock and Icosahedron; Surface mat, Crossed cards, Low-poly clumps and Detailed shoots; and Low/High detail. Detailed shoots remain the clearest optimization target. Frame intervals from short headless runs are comparative and contain scheduler spikes; they are not a universal hardware guarantee. No representative GLB fixture was available, so imported-model timing remains open.

## Colony variation and update-cost verification - 2026-09-26
Production syntax checks and all 28 tests pass. Spore regressions now verify monotonic revision changes on release/reset and no revision change for an idle empty pool. Source checks confirm the new Colony variation and Patchiness bindings, bare-field geometry suppression, 4 Hz diagnostics presentation and renderer allocation/visibility reporting.

The later Chrome review above closes the shader-compilation and initial-default checks. Triangle counts and frame intervals provide comparative evidence, while direct GPU overdraw counters remain unavailable in the current harness.

## Pointer and progressive-renderer verification - 2026-09-12
Production syntax checks and all 28 tests pass. The new interaction test verifies that left mouse is unassigned from OrbitControls, middle maps to pan, right maps to orbit, and the context menu is suppressed. Existing field and renderer-facing regressions continue to pass.

Low startup quality now creates 30,000 shoot slots and High detail expands to 60,000 only when a visible triangle/card/shoot representation needs them. Anchor placement remains stratified but adds deterministic session-seeded angular and radial variation. Browser gesture feel, visual distribution and allocation timing remain for hands-on Chrome review; no browser automation was run.

## Studio Stage 5 surface verification - 2026-09-12
Production syntax checks and all 27 numerical, spore, export and surface tests pass. New tests cover all six built-in samplers, finite normalized output, seed-stable and seed-varying rock deformation, closed radial triangle conversion and rejection of open geometry. Static UI checks found no duplicate IDs or stale Paint-toggle/Erase-checkbox selectors.

GLB loading is limited to self-contained files with at most 10,000 triangles and at least 98% directional coverage after centering. Radial lookup construction is bounded and occurs only during import. Browser-side GLB decoding, shader compilation for the new substrate modes, rail placement and real imported-model painting remain for hands-on Chrome review; no browser automation was run.

## Studio Stage 4 and initialization verification - 2026-09-12
Production syntax checks and all 25 numerical, spore and export-setting tests pass. New checks cover deterministic same-seed initialization, different spatial fields from different seeds, unsigned seed validation, exact export settings, alpha-format rules, compression bounds, GPU dimension limits and total-pixel limits.

The startup scene is configured directly as a paused low-detail Sphere with Surface mat rendering; it no longer constructs the high-detail Rock as its initial propagation mesh. Paused rendering is capped at 15 fps and returns to the normal animation cadence during playback. Browser image encoding, transparent postprocessing and GPU-specific maximum output behavior remain for hands-on Chrome review. No browser automation was run in this delivery, following the preference to avoid costly visual checks unless needed.

## Studio Stage 3 verification - 2026-09-11
Production syntax checks and all 22 numerical/spore tests pass. New focused checks verify that a selected-type reset seeds only that lineage and that conversion preserves coverage, biomass, age, stress and dormant reserves while moving lineage data. Invalid type identifiers are rejected.

The panel layout change was reviewed at source level, following the user's preference for lightweight validation of minor visual work. Utility panels and Object child forms explicitly align content to the top with fixed gaps. No browser automation was run for this delivery; any future interactive check should use Chrome.

## Control organization verification - 2026-09-11
The focused studio browser check passes 18 desktop assertions and 21 narrow-screen assertions with no browser errors. Coverage includes keyboard-accessible Object child tabs, correct Surface/Moss/Scene/Render ownership, a common right-aligned slider axis, top-level keyboard navigation, responsive drawers, transport access and capture routing. Visually reviewed [Object / Surface](data/ui-refactor-object-surface.png) and [Object / Moss](data/ui-refactor-object-moss.png). No simulation or rendering behavior changed.

The subsequent Bonsai tab-style adjustment was reviewed at source level only, per user preference for lightweight validation of minor UI work. Future interactive checks should use Chrome rather than Edge.

## Studio Stage 2 verification - 2026-09-11
Production syntax checks and all 20 numerical/spore tests pass. New unit checks cover finite normalized built-in samplers and state-preserving surface replacement. The focused browser check passes eight behavior assertions with no browser or shader errors; see [results](data/STAGE2_BROWSER_CHECK_2026-09-11.json). At the tested scene and 1440 x 1000 viewport, measured triangle counts were: detailed shoots 603,710; crossed cards 242,210; diamonds 122,210; low-poly clumps 123,710; triangles 62,210; surface mat 2,210. Density 0.25 reduced active shoot instances to 15,000. These counts are comparative measurements on the current scene, not fixed budgets across future models.

Visually reviewed the [default detailed rock](data/studio-stage2-default.png), [controls](data/studio-stage2-controls.png), and [icosahedron/cards variant](data/studio-stage2-icosa-cards.png). Card density and scale can intentionally produce a coarse stylized result; defaults retain detailed shoots. General imports, UV transfer and age mapping are deferred. GPU overdraw is not represented by triangle count, so cards still require device performance review.

## Studio Stage 1 checks
Validate desktop ordering and rail centering, mutually exclusive keyboard-accessible tabs, narrow-screen drawer dismissal/focus, panel collapse/reopen, canvas resize without state reset, Play/Pause, one-tick stepping, restart of the selected initial preset, elapsed time, speed, and capture routing into Export. Retain all numerical/spore tests. Record screenshots and browser results under `data/`.

Stage 1 delivery verification (2026-09-11): production syntax checks and all 18 numerical/spore tests pass; `git diff --check` is clean. `tests/studio-check.js` passes 14 assertions at 1440 x 1000 and 17 at 390 x 844, with no browser errors. Results: [desktop](data/STUDIO_DESKTOP_CHECK_2026-09-11.json), [mobile](data/STUDIO_MOBILE_CHECK_2026-09-11.json). Visually reviewed [desktop](data/studio-stage1-desktop.png) and [mobile](data/studio-stage1-mobile.png) captures. Desktop controls reclaim canvas space; mobile transport remains reachable while drawers are open. Portrait framing retains the existing camera and may crop the rock; automatic object fitting is not part of this shell delivery. No rendering-performance improvement is claimed.

To rerun against the local server on port 8765 and a dedicated browser debugging session on port 9333, set `KOKE_EXPRESSION` to `import('/tests/studio-check.js').then(m=>m.runStudioChecks())`, set `KOKE_VIEWPORT` to `1440x1000` or `390x844`, then run `node tests/browser-session.mjs reload`. No build or lint tool is configured.

## Redesign verification - 2026-09-11
- Final browser run: 13 assertions passed with no reported errors; see `data/BROWSER_CHECK_2026-09-11.json`. Live playback measured 33.3 ms median / 50 ms p95 at 688 x 794, DPR 1, on Intel UHD 620 in both detail tiers; 1080p/60 fps remains unverified and unmet by this sample. See `data/PERFORMANCE_2026-09-11.json`.
- `npm test`: 18 passing tests, including the active field and causal spores. Coverage includes finite long evolution, input validation, empty state, species lineage, seam/pole painting, habitat updates, equal elapsed-time playback, coverage statistics, drought collapse, dormant recovery, gravity/aging, delayed germination, pool limits, and dry landing.
- `npm run check`: syntax checks cover all production modules. There is no configured build or lint tool; browser shader compilation is checked separately.
- `tests/browser-check.js` exercises the active app through Start/Pause, presets, painting, growth, spores, drought, visual effects, PNG capture, shader program status, and Low detail. Run using the local CDP helper; delivery notes contain commands and artifact paths.
- `tests/browser-perf.js` measures 100 visible animation intervals per quality tier with live simulation. Startup compilation and optional effects are excluded from this baseline. Hardware and exact viewport are recorded with the results; no universal 60 fps claim is made.
- Visual limits: cushion/leaf instancing is an interactive approximation; no mesh-fracture collapse, arbitrary topology, or scientific ecological accuracy is promised. Diffusion follows the spherical grid and has latitude-dependent physical spacing. Brush influence uses local surface-point chord distance on the known rock.
- The 2026-09-10 audit and its probes describe the old implementation; use the current tests to validate fixes rather than rerunning that historical fixture against the redesigned API.

## 2026-09-10 audit baseline
- See [the rendering audit](data/MOSS_RENDERING_AUDIT_2026-09-10.md) for prioritized defects and required regression/visual checks.
- `npm run check` and all six existing tests passed. These validate syntax and legacy helpers/simulation, not active field correctness or GPU shaders. No build or lint script is configured.
- Standalone active-field probes reproduce nonfinite default state, inconsistent mapping, stale habitat, species contamination, incorrect coverage statistics, inactive controls, and frame-dependent pacing. Run `node _docs/data/audit-field-probes.mjs`; captured results are in `data/AUDIT_FIELD_PROBES_2026-09-10.json`.
- Probe output describes defects, not passing acceptance tests. Browser image quality, shader compilation, capture behavior, and performance were not verified in this audit.

## Risks Reviewed
- Product risk: visual ambition drifting behind a tool-heavy prototype shell.
- Regression risk: legacy and current simulation paths diverging while both remain in the repo.
- Visual risk: moss reading as noisy procedural texture instead of cohesive growth.
- Pacing risk: the sim feeling either static or chaotic rather than ambient.
- Performance risk: visual upgrades undermining stable passive playback.

## Current Mitigations
- Treat the field-based simulation/rendering path as the active visual evaluation path.
- Keep simulation cadence decoupled from render cadence.
- Use the built-in object as a fixed evaluation surface to reduce variables during look development.
- Preserve diagnostics and snapshot/report flows for internal tuning and review.

## Ambient MVP Checklist
- `npm run check` passes.
- `npm test` passes.
- Browser run validates:
  - the ambient scene loads without setup friction
  - the built-in object is visually readable at rest and in motion
  - moss growth appears continuous and mat-like rather than spotty or vertex-bound
  - the lifecycle read is understandable from a distance: emergence, bloom, maturity, fade
  - the animation pace feels calm and intentional over at least a few minutes of passive viewing
  - lighting and camera controls are sufficient to evaluate the look from multiple angles
  - the UI does not overwhelm the ambient experience
  - snapshot export is usable for look review
  - diagnostics remain available for development tuning

## Phase 2 Painting Checklist
- paint mode can seed growth reliably
- erase/thin behavior is predictable
- painted input inherits the same validated ambient visual language
- painting controls stay artist-focused and do not reopen the full raw tuning surface

## Notes
- Existing unit coverage is still narrow and primarily validates helper logic.
- No lint config exists in this phase, so no lint command is run.
- Ambient visual review in-browser is currently more important than adding more low-level parameter tests.
