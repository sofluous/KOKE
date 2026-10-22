# ROADMAP

## Current priority - studio workflow
See [STUDIO_PROPOSAL.md](STUDIO_PROPOSAL.md). Stages 1 through 5 and topology-general GLB activation are delivered for visual review: studio shell, built-in and imported surfaces, moss representations, mapped color controls, biological moss profiles, configurable still-image export and graph-backed growth on open, folded, porous or disconnected meshes. The next graph-rendering delivery should add model-scale-aware moss defaults, then use representative user models to tune import and Low allocation cost. Earlier rendering delivery and plans below remain historical context.

The shell hierarchy was refined after review: Object now switches between Surface and Moss child panels, Scene owns external factors, and Render owns camera/quality/effects. Control columns follow Bonsai's right-aligned form rhythm.

Panel forms are top anchored and retain consistent gaps regardless of content length. Cushion, Sheet and Feather types now affect simulation and renderer traits; selection applies to painting and starts, while existing colonies require an explicit conversion or reseed.

Initialization now defaults to a paused low-detail Sphere and Surface mat. Each launch has a random session seed, with URL seed replay available. Image export provides exact dimensions, common presets, PNG/JPEG/WebP, alpha where supported, quality, detail and effect controls while restoring live state after capture.

Surface delivery now includes six built-ins, seeded rock deformity, procedural material controls and graph-backed GLB import for open, folded, porous and disconnected meshes up to 10,000 triangles. Brush and Eraser use face-index collision on imported models and remain in the centered rail tool group with a dedicated temporary settings panel.

Pointer mapping is now fixed across every tool: left interaction, middle pan/track, right orbit and wheel zoom. The first organic/performance pass adds session-seeded anchor jitter and progressive 30,000-to-60,000 shoot allocation. Further work should measure GPU overdraw on target hardware and tune colony-scale variation from visual review.

The second organic/performance pass adds adjustable colony-scale variation and shoot patchiness without increasing geometry. Bare fields suppress geometric moss draws, spore buffers update only after visible state changes, and diagnostics refresh at 4 Hz.

The Chrome review is now recorded at a fixed 1920 x 1080 buffer. Reference-led tuning reduced the repeated spherical cushion effect without adding geometry. Surface mat and cards generally retained a 16.7 ms median on Intel UHD 620, while detailed shoots produced the least reliable frame times.

Distance-sensitive shoot detail is delivered. Macro views retain the requested Low/High and Density budget, while overview distances smoothly reduce only Detailed-shoot instances to as little as 45%.

Species-specific geometry is also delivered without increasing draw calls or geometry budgets. Cushion is compact and mounded, Sheet is low and creeping, and Feather is narrow and upright; mixed colonies blend these profiles.

The first topology-general delivery is complete as an isolated mesh surface graph. It proves welded triangle adjacency, component isolation, area-weighted samples, graph painting and graph propagation on a folded/disconnected fixture while leaving the radial product path intact.

The graph-backed simulation adapter is now delivered. Each triangle carries species, vitality, moisture, biomass, age, stress, dormant reserves and dead matter using the same fixed-step environment and species contracts as the active field. Lifecycle propagation stays within connected graph components.

Stable triangle/barycentric render anchors are also delivered as an isolated contract. They are deterministic, area weighted, component aware, provide an orthonormal surface frame and map every lifecycle channel into reusable per-anchor buffers.

Face-index graph painting is delivered at the simulation boundary. Paint and erase brushes follow graph distance, update the appropriate biological channels and cannot cross disconnected surfaces.

Mesh raycast collision is also delivered. Import validates face-order identity, and world-space hits resolve to triangle, barycentric, component, point and normal data before driving graph painting.

Graph-renderer integration is delivered as an isolated Three.js adapter. It supports the continuous surface and five geometric representations, stable 30,000/60,000 instance budgets, species morphology, lifecycle-driven color and growth, revision-gated buffer uploads and the shared collision mesh.

Graph spore collision is delivered with a bounded particle pool, accelerated segment/triangle queries, exact landing identity and species-preserving delayed germination.

The coordinated general-model runtime is now active in the UI. Import, simulation, rendering, painting, collision, spores, diagnostics and export switch together, while built-in and imported state survive surface changes. A Chrome end-to-end check covers open and disconnected faces, painting, representation control, runtime restoration and shader compilation.

Progressive graph detail is delivered. Low imports allocate 30,000 capacity-stable anchors; High expansion is deferred until geometric moss is visible, preserves every existing attachment and occurs only once. Graph Detailed shoots now use the shared distance curve, measuring 30,000 instances at Macro and 14,665 at Isometric in the focused Chrome check, while Cards remain at their 30,000 manual budget.

The near-limit performance baseline is now recorded with a deterministic 9,350-triangle folded, apertured and disconnected GLB. Import took 417.5 ms and the original synchronous High expansion took 100.8 ms on the recorded machine. Cards and overview shoots were stable; Macro Detailed shoots reached a 50 ms p95. Simulation, full-pool spores and BVH collision remained below their fixed-step budgets.

Chunked High preparation is delivered. The High interaction returns immediately while the renderer prepares the deterministic 60,000-anchor replacement over subsequent frames with Low geometry still visible.

Staged lifecycle synchronization is also delivered. High preparation now fills lifecycle state before swapping, and recurring revisions use reusable 8,000-anchor batches with partial GPU update ranges. The repeat near-limit run measured a 6.6 ms High interaction, 370.6 ms elapsed readiness, a 10.8 ms largest High chunk and a 2.1 ms largest lifecycle chunk. Rapid playback revisions are coalesced; the sampled renderer trailed by four to five revisions during sustained evolution. Model-scale-aware moss defaults are next, followed by representative-model tuning of import and Low allocation cost.

## Delivery update - 2026-09-11
- Implemented field correctness repairs: finite validated inputs, unified mapping, updated habitats, species preservation, area-weighted statistics, and fixed-time evolution.
- Implemented layered moss on one rock: basal material, raised cushions, leafy shoots, lighting, and shadows.
- Implemented colony growth, capacity-limited spread, aging, drought collapse, and dormant recovery.
- Implemented causal spores with bounded pools, collision, delayed germination, and species lineage.
- Implemented optional dew/soft focus, repeatable reset and camera presets, capture, and a lower-detail tier.
- Next visual review: compare exported overview/macro images with the supplied references, tune density/material character and species forms, and establish budgets on the user's normal hardware.
- Deferred: detached large fragments, general folded/porous/imported substrates, and high-end cinematic fidelity. Those need separate geometry/adjacency work and further art direction; radial rock mapping is not a general surface solution.

Earlier planning follows for context; proposed status below predates this delivery.

## Proposed priority update — 2026-09-10
The [reference-led rendering audit](data/MOSS_RENDERING_AUDIT_2026-09-10.md) recommends: repair active-field correctness; prove a static layered moss material on one rock; add spatial growth/collapse; add causal spore particles; then polish and broaden substrates. These are proposed next steps, not completed stages. Existing stages below describe the earlier ambient reset.

## Stage 1: Ambient Reset
- Reframe KOKE as an ambient growth simulation first.
- Reduce the apparent product scope to one object, one visual loop, and a small set of tuning controls.
- Use the current field simulation and field renderer as the primary experimentation path.
- Preserve legacy cell/clump code only as reference until the ambient path is stable.

## Stage 2: Visual Validation
- Tune growth pacing, bloom/fade timing, and species coloration for stronger passive viewing.
- Simplify the live controls to those that materially affect the visual outcome.
- Capture a review set of stills and short recordings to judge whether the aesthetic is working.
- Decide whether the renderer needs additional surface detail, wetness, or silhouette treatment.

## Stage 3: Ambient MVP Hardening
- Remove or archive deprecated implementation paths once the ambient direction is confirmed.
- Tighten the shell so the simulation reads as a finished ambient object rather than an internal sandbox.
- Add browser-level verification for the ambient MVP path.
- Document the validated ambient defaults and presets.

## Stage 4: Moss Painting Mode
- Reintroduce painting as a deliberate creative mode on top of the validated ambient visual system.
- Keep painter controls focused on artistic outcomes rather than exposing raw simulation complexity.
- Support brush seeding, erase/thin behavior, and a small set of style/species presets.

## Deferred
- arbitrary 3D object import
- large species library or encyclopedia mode
- advanced export formats
- simulation-state persistence
- broader scientific/ecological framing
