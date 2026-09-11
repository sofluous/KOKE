# QA

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
