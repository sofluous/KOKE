# PRODUCT

## Studio organization decision - 2026-09-11
Adopt a left rail/control panel, central viewport with transport below it, and right observation panel. Group Scene, Moss, Render, Export and Settings consistently with the related app projects. The [studio proposal](STUDIO_PROPOSAL.md) records the full future pipeline. Panel operations and display preferences preserve simulation state. Transport is elapsed-time playback, not arbitrary timeline seeking.

## Appearance controls - 2026-09-11
Rock, Sphere and Icosahedron are selectable built-in radial surfaces. The renderer offers a continuous mat, triangle, diamond, crossed-card, low-poly clump and detailed-shoot representations with independent density and proportions. Root/tip/stressed palettes can map species, health, thickness, moisture or height. These are render decisions and preserve biological field state. Surface changes also preserve that UV field but rebuild surface-dependent habitat and clear world-space spores.

## Current implementation - 2026-09-11
The reference-led redesign is implemented for one built-in radial rock. A shared object-space surface model drives habitat, painting, moss placement, and spore collision. The live field advances at 20 fixed steps per simulated second and preserves species lineage. Biomass, cushion thickness, wetness, age, stress, dead matter, and dormant reserves now have distinct roles.

Rendering combines a textured substrate, continuous basal mat, 1,500 instanced cushion anchors, and up to 60,000 leafy shoot instances (30,000 in Low detail). Species weights affect color and shoot shape. Stress browns and flattens growth; moisture restoration activates species-specific dormant reserves. A bounded pool of 160 spores supports release, flight, landing, delayed germination, and expiry.

Mature, Seed, and Bare reset presets provide repeatable starting points. Start/Pause, moisture, growth controls, playback speed, aging, painting, macro camera, optional dew, and optional soft focus are available. Capture renders the current effects immediately before producing its PNG.

New modules: `substrate.js` owns radial geometry/mapping; `spores.js` owns causal particle state; `view-effects.js` owns optional depth of field. `field-sim.js` and `field-renderer.js` are the active implementation; legacy simulation/rendering remain available as reference. No arbitrary imported, folded, or porous surfaces are supported by this radial mapping. The fixed-time solver clamps unusually long frame gaps to 0.25 seconds to avoid runaway catch-up.

This implementation supersedes the color-only/shader-first priorities and proposed-status statements in the earlier planning record below. See [delivery notes](data/MOSS_IMPLEMENTATION_2026-09-11.md).

## Visual audit update — 2026-09-10
The user requests richer growth, collapse, spread, clumps, texture, and particles guided by four supplied renders. The [current-code audit](data/MOSS_RENDERING_AUDIT_2026-09-10.md) identifies correctness defects and concludes that color-only coverage cannot meet that target. Its proposal retains the continuous field but adds raised cushions and fine shoots driven by persistent lifecycle state, followed by causal spore particles. This is a proposed revision to the shader-first visual priorities below; no rendering redesign has yet been implemented.

## Goal
Build an ambient browser-based moss growth simulation that proves the visual language, pacing, and mood of KOKE before expanding into a more interactive moss painting tool.

## Product Position
KOKE is currently an ambient growth object, not a full simulation platform and not yet a painter-first tool.

The immediate purpose is to answer one question:

Can we create a slow, beautiful, believable moss growth aesthetic that feels worth looking at on its own?

If the answer is yes, the project can then expand into a guided painting mode that lets the user seed or shape growth intentionally.

## Current Product Decision

### Phase 1: Ambient Growth Sim
Focus on:
- one built-in object
- one strong visual loop
- slow autonomous growth
- minimal interaction
- visual tuning and aesthetic verification

### Phase 2: Moss Painting Mode
Add:
- direct user seeding/painting
- painter-oriented controls
- simplified artistic control over spread and decay

Painting remains in scope for the project, but it is not the feature that should define the first success milestone.

## Architecture
- `src/scene.js`: Three.js setup, camera, lighting, controls, built-in mesh bootstrap.
- `src/simulation.js`: surface analysis helpers and legacy cell-based prototype logic retained as reference.
- `src/renderer.js`: legacy hybrid renderer retained as reference.
- `src/field-sim.js`: ambient-first texture field simulation with species channels and wet-growth lifecycle state.
- `src/field-renderer.js`: shader-driven contiguous moss carpet renderer.
- `src/ui.js`: control and utility shell bindings.
- `src/debug.js`: diagnostics panel and snapshot/report helpers.
- `src/main.js`: composition root and animation loop orchestration.

## Core Experience

### What the user should feel
- calm
- curiosity
- visual richness without clutter
- confidence that the system has a clear aesthetic identity

### What the user should do
- load the page
- watch the object evolve
- make a few light adjustments to compare visual outcomes
- capture snapshots for review

### What the user should not need to do
- learn a large control surface
- manage species libraries
- import assets
- think about technical simulation settings unless we are tuning internally

## MVP Definition
The ambient-first MVP should include:
- one built-in object
- autonomous moss growth over time
- one cohesive visual style
- lighting and camera controls
- minimal growth tuning controls
- snapshot export for visual review
- diagnostics available for development, not as a primary user-facing feature

## Success Criteria

### Primary
- the growth reads as continuous moss coverage rather than noisy procedural texture
- the object feels visually compelling when left running passively
- the pacing feels intentional: not static, not chaotic
- the project produces frames or short captures that are aesthetically worth keeping

### Secondary
- the rendering remains smooth on the target hardware for the built-in object
- a small set of controls is enough to explore meaningful look variations
- the code path for ambient growth is simple enough to iterate on quickly

## Non-Goals For This Phase
- arbitrary 3D object import
- encyclopedia/species education features
- scientific or ecological accuracy as a primary promise
- large parameter surfaces for end users
- broad export tooling beyond what is needed for look evaluation
- fully productized painting workflows

## Visual Priorities
- contiguous moss mats over spotty point growth
- clear lifecycle phases: wet, bloom, mature, fade
- strong silhouette read at a distance
- rich close-up surface character without noisy shader clutter
- slower, more meditative evolution over reactive simulation drama

## Technical Priorities
- commit to the field-based growth/rendering direction for visual evaluation
- keep simulation cadence decoupled from render cadence
- bias toward shader-driven continuity over geometry-heavy detail
- optimize for one known object first instead of designing for arbitrary mesh support

## Constraints
- current implementation uses a built-in primitive mesh for evaluation
- browser-based rendering must remain performant without a heavy asset pipeline
- the current repo may continue to hold legacy prototype paths temporarily, but new work should not split focus between architectures

## Known Risks
- visual complexity may still read as procedural noise instead of moss
- too many controls may distract from evaluating the ambient experience
- keeping legacy and current paths side-by-side for too long may slow decision-making
- the built-in object may overfit the look and hide problems that appear on other surfaces later

## Follow-On Expansion Path
If the ambient simulation succeeds, the next product step is a moss painting mode with:
- paint to seed growth
- erase/thin growth
- species or style presets
- guided artistic control with fewer raw simulation parameters

That future mode should inherit the validated ambient visual system rather than invent a separate rendering identity.
