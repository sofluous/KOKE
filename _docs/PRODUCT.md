# PRODUCT

## Pointer interaction and organic placement - 2026-09-12
Pointer behavior is invariant across tool state: left drag belongs only to the active interaction tool, middle drag pans/tracks, right drag orbits, and the wheel zooms in or out. The viewport suppresses the browser context menu so right-orbit remains uninterrupted. Brush and Eraser therefore cannot accidentally hand a left stroke to camera rotation.

Low-detail startup allocates capacity for 30,000 shoot instances and uses a lightweight placeholder while Surface mat is active. The renderer expands to the 60,000-instance High tier only when a visible geometric moss representation requests it. Plant and dew anchors use session-seeded stratified jitter, retaining broad surface coverage while reducing regular Fibonacci patterns between colonies.

## Surface workflow and painting tools - 2026-09-12
The propagation surface now includes Rock, Faceted Rock, Sphere, Ellipsoid, Rounded Cube and Icosahedron. Rock shapes use the launch seed and a Deformity control, so repeated sessions produce different but reproducible forms. Faceted geometry uses a deliberately smaller tessellation budget for a stronger polygonal silhouette and lower draw cost.

Surface material controls provide base/accent colors, Smooth, Fine grain, Layered, Cracked stone and Speckled procedural textures, texture scale and variation, and roughness. These change rendering without resetting biology.

Self-contained GLB import supports closed, star-shaped meshes up to 10,000 triangles. Imported geometry is centered, normalized and converted to a cached radial lookup used consistently by growth, painting, plant placement and spore attachment. Models that are open, porous, folded around themselves, disconnected, or do not enclose the normalized origin are rejected because the current radial field cannot represent their topology safely.

Brush and Eraser are persistent tools centered in the left rail. Their dedicated temporary tool panel owns radius and strength; painting controls no longer appear inside the Moss object panel.

## Lightweight initialization and image export - 2026-09-12
KOKE starts paused on a low-detail Sphere using the continuous Surface mat and Low render detail. Paused rendering is capped at 15 fps, while active simulation retains the normal animation cadence. This keeps the initial draw path small while preserving Rock, richer geometry representations and High detail as deliberate choices. Each launch creates an unsigned 32-bit seed that changes initial colony placement, habitat capacity and lifecycle variation. Restart retains the session seed for reproducibility; adding `?seed=<number>` to the URL recreates a specific initialization.

Still-image export supports Viewport, 1920 x 1080, 2048 x 2048, 3840 x 2160 and custom dimensions; aspect locking; PNG, JPEG and WebP; supported transparency; compression quality; render detail; and optional view effects. Export freezes simulation time, renders at the requested pixel dimensions, validates against GPU and pixel limits, then restores the live viewport, camera, quality, effects and playback state.

## Studio organization decision - 2026-09-11
Adopt a left rail/control panel, central viewport with transport below it, and right observation panel. The top-level groups are Object, Scene, Render, Export and Settings. Object follows Bonsai's part-switch pattern with Surface and Moss child tabs: propagation-surface controls stay under Surface, while moss growth, geometry, color and painting stay under Moss. Scene owns external factors such as environment and lighting; Render owns camera, quality and view effects. Panel operations and display preferences preserve simulation state. Transport is elapsed-time playback, not arbitrary timeline seeking. See [the studio proposal](STUDIO_PROPOSAL.md) for the wider pipeline.

## Appearance controls - 2026-09-11
Rock, Sphere and Icosahedron are selectable built-in radial surfaces. The renderer offers a continuous mat, triangle, diamond, crossed-card, low-poly clump and detailed-shoot representations with independent density and proportions. Root/tip/stressed palettes can map species, health, thickness, moisture or height. These are render decisions and preserve biological field state. Surface changes also preserve that UV field but rebuild surface-dependent habitat and clear world-space spores.

## Moss types - 2026-09-11
Cushion Moss, Sheet Moss and Feather Moss provide meaningful biological and visual profiles. Type affects habitat response, growth, decay, spread, spores, color and morphology. The selected type applies to painting and selected-type starting presets. Existing colonies change only through the explicit `Convert existing` action, which preserves field history and biomass, or `Reseed scene`, which creates a new sparse field of the selected type.

Control panels use top-anchored content with consistent section and row gaps. Switching to a shorter panel therefore leaves unused space below the form rather than stretching controls vertically.

## Current implementation - 2026-09-11
The reference-led redesign supports built-in radial Rock, Sphere and Icosahedron surfaces. A shared object-space surface model drives habitat, painting, moss placement, and spore collision. The live field advances at 20 fixed steps per simulated second and preserves species lineage. Biomass, cushion thickness, wetness, age, stress, dead matter, and dormant reserves now have distinct roles.

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
