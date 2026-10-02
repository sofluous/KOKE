# QA

## Graph simulation adapter verification - 2026-10-02
Production syntax checks and all 32 automated tests pass. The adapter regression verifies the complete semantic channel contract and array dimensions, propagation around a folded component without transfer to a nearby disconnected sheet, biomass and age preservation during species conversion, drought-created dormant reserves and dead matter, moisture-driven recovery without species contamination, deterministic seeded evolution, and identical fixed-time results at 30, 60 and 120 fps.

Inputs reject invalid graphs, seeds, environment values, light directions, species identifiers and step durations. State is finite after the exercised lifecycle runs. Per-step work scales with triangle and shared-edge counts and uses preallocated typed arrays; at the current 10,000-triangle import limit this remains an isolated CPU path and has not yet received browser frame-time profiling. Renderer attachment, face-index brush input, mesh spore collision and active general-model import remain outside this verification.

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
