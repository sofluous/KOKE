# ROADMAP

## Current priority - studio workflow
See [STUDIO_PROPOSAL.md](STUDIO_PROPOSAL.md). Stages 1 through 5 are delivered for visual review: studio shell, expanded built-in and imported radial surfaces, moss representations, mapped color controls, biological moss profiles, and configurable still-image export. Next work should focus on organic tuning and measured performance, followed by a topology-general surface graph if folded or porous model support is required. Earlier rendering delivery and plans below remain historical context.

The shell hierarchy was refined after review: Object now switches between Surface and Moss child panels, Scene owns external factors, and Render owns camera/quality/effects. Control columns follow Bonsai's right-aligned form rhythm.

Panel forms are top anchored and retain consistent gaps regardless of content length. Cushion, Sheet and Feather types now affect simulation and renderer traits; selection applies to painting and starts, while existing colonies require an explicit conversion or reseed.

Initialization now defaults to a paused low-detail Sphere and Surface mat. Each launch has a random session seed, with URL seed replay available. Image export provides exact dimensions, common presets, PNG/JPEG/WebP, alpha where supported, quality, detail and effect controls while restoring live state after capture.

Surface delivery now includes six built-ins, seeded rock deformity, procedural material controls and validated GLB import for closed star-shaped meshes up to 10,000 triangles. Brush and Eraser moved to a centered rail tool group with a dedicated temporary settings panel. General folded/disconnected topology remains deferred because it requires triangle adjacency, non-radial painting and attachment data rather than the current spherical field.

Pointer mapping is now fixed across every tool: left interaction, middle pan/track, right orbit and wheel zoom. The first organic/performance pass adds session-seeded anchor jitter and progressive 30,000-to-60,000 shoot allocation. Further work should measure GPU overdraw on target hardware and tune colony-scale variation from visual review.

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
