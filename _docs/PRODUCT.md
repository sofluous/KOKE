# PRODUCT

## Goal
Build a modular, performant browser-based 3D simulation where moss coverage grows over mesh surfaces in real time based on environmental factors.

## Architecture
- `src/scene.js`: Three.js setup, controls, camera, lights, mesh bootstrap.
- `src/simulation.js`: Surface analysis, per-cell growth/decay, batched simulation updates.
- `src/renderer.js`: Hybrid rendering with shader tint + instanced clumps.
- `src/ui.js`: DS-tokenized control binding layer for shell controls and view actions.
- `src/debug.js`: Live diagnostics panel and report snapshot builder.
- `src/main.js`: Composition root and animation loop orchestration.

## Data model
- Surface is represented as welded vertex cells derived from geometry positions.
- Cell fields:
  - `density` in `[0..1]`
  - `health` in `[0..1]`
  - `speciesId` (active species seed/ownership)
  - `slope`, `heightNorm`, `lightFacing`
  - `neighbors[]`

## Constraints
- Simulation updates every `N` render frames (`tickEveryFrames`) instead of every frame.
- Each tick processes only a batch (`batchRatio`) of cells to cap CPU spikes.
- Instanced rendering is used for visible clumps to avoid per-instance mesh allocation.

## Assumptions (Phase 1)
- Uses an internal primitive mesh (`IcosahedronGeometry`) as the test surface instead of loading GLTF.
- Species set is intentionally fixed to a small built-in catalog (`Forest Moss`, `Rock Lichen`, `Velvet Moss`) for iterative tuning.
- No persistence/export in this phase.

## Interactive Paint Tooling (Current)
- Brush painting is event-driven (pointer + raycast) and does not run inside the per-frame loop.
- Painter controls:
  - `Paint` toggle
  - species selector
  - brush radius
  - brush strength
  - erase mode
- Species seeding from paint strokes feeds the same batched simulation system, so painted areas continue natural spread/decay after seeding.
- A lightweight spatial index over simulation cells is used for brush queries to keep strokes performant on high-density meshes.

## Design System Foundation (Current)
- KOKE consumes the shared included package at `design-system/`:
  - `design-system/theme.css`
  - `design-system/js/theme-registry.js`
  - `design-system/js/theme-selector.js`
- App-local CSS (`src/styles.css`) is now layout-specific only and references shared DS tokens/classes (`--ds-*`, `.ds-*`).
- Local design-system source files are intentionally avoided to prevent divergence from the shared system.
- The UI shell now follows a studio layout:
  - sticky top control bar
  - left control panel
  - center viewport card
  - right utility panel with rail navigation for `view`, `snapshot`, `diagnostics`, `export`, `settings`
  - compact header actions with a `Settings` shortcut that opens the utility rail settings tab
  - consolidated 3D camera controls in a single DS camera-pad style widget (no duplicated view controls across zones)

## Debug and Perf Instrumentation (Current)
- `src/debug.js` drives a diagnostics panel with:
  - FPS and frame time
  - simulation ticks per second and last tick cost
  - active-cell ratio and average density
  - clump counts and current batch size
- Copyable runtime snapshots were added to improve bug reports and issue communication.
- Basic UX controls are present in the shell:
  - `Start Sim`
  - `Pause Sim`
  - theme selection (`data-ds-theme-select`)
- Added shell utility flows:
  - 3D view presets (`Iso`, `Front`, `Top`, `Left`)
  - in-app view snapshot preview
  - PNG export and JSON report export

## Moss Behavior Progress (Current)
- Added patch-based seeding and diffusion smoothing for less geometric growth fronts.
- Added `colonization` and `gravityCreep` parameters to better shape spread and moisture-biased creep.
- UI now exposes growth and performance controls in grouped folders for faster tuning.
- Growth now follows a calmer lifecycle loop (`age`, `dormancy`, `mass`) to reduce rapid/random spread and create slower contiguous expansion.
- Added cohesion-based consolidation so nearby colonies merge into larger moss mats instead of isolated points.
- Species include clump behavior profiles to vary rendered shape character (flatter lichen mats vs tufted velvet growth).
- Added brush radius preview in viewport for more precise seeding before propagation.


Below is a **clean, formal design document** followed by a **well-structured Codex prompt** designed to initiate development with clarity and strong architectural direction.

---

# Moss Growth Art App

## Formal Design Document (v1.0)

---

## 1. Project Title

**Moss Growth Art App (Working Title)**

---

## 2. Executive Summary

The Moss Growth Art App is a real-time, procedural 3D application that simulates the organic growth of mosses and lichens across surfaces of virtual objects. The system blends ecological logic with artistic rendering to create evolving, living sculptures.

Users can import or select 3D objects, define environmental conditions, and observe slow, naturalistic colonization over time. The application functions as both a generative art tool and an interactive scientific display.

---

## 3. Objectives

### Primary Objectives

* Simulate believable moss and lichen growth over 3D surfaces
* Maintain high rendering performance across devices
* Provide a visually compelling, ambient experience
* Support export of still and animated outputs

### Secondary Objectives

* Educate users through a structured species library
* Enable creative exploration through environmental controls
* Support extensibility for future simulation complexity

---

## 4. Scope

### In Scope

* 3D object import and visualization
* Procedural growth simulation
* Environmental influence modeling
* Species library and metadata display
* Real-time rendering modes
* Export (image, GIF, video)

### Out of Scope (Initial Release)

* Full biological accuracy
* Multiplayer or shared environments
* Complex physics interactions
* Full ecosystem simulation (beyond surface growth)

---

## 5. System Overview

The application consists of four primary systems:

1. **Surface Analysis System**
   Interprets mesh geometry for ecological suitability.

2. **Growth Simulation System**
   Drives propagation, decay, and dormancy.

3. **Rendering System**
   Displays moss using layered visual techniques.

4. **User Interface System**
   Controls interaction, visualization, and data display.

---

## 6. Core Features

### 6.1 3D Object System

* Import standard 3D formats (GLTF/OBJ recommended)
* Auto-scale and center objects
* Generate surface analysis data on load
* Orbit camera with zoom and pan

---

### 6.2 Growth Simulation

#### Functional Behavior

* Moss propagates across surface cells
* Growth influenced by environmental parameters
* Supports:

  * expansion
  * dormancy
  * dieback
  * recolonization

#### Simulation Model

Growth operates on a surface-based map rather than individual strands.

Each surface unit stores:

* species ID
* density
* moisture
* health
* age
* dormancy state

---

### 6.3 Environmental System

#### Input Parameters

* Light direction and intensity
* Moisture / humidity
* Water proximity
* Surface angle
* Depth / concavity
* Temperature (optional future phase)

#### Derived Values

* Wetness score
* Exposure level
* Retention factor
* Growth suitability

---

### 6.4 Species Library

Each species includes:

* common name
* scientific name
* type (moss / lichen)
* habitat
* environmental preferences
* growth traits
* visual characteristics
* descriptive notes

---

### 6.5 Rendering System

#### Rendering Layers

**Layer 1: Surface Mask**
Controls colonization distribution.

**Layer 2: Shader-Based Growth**
Applies color, roughness, and soft blending.

**Layer 3: Instanced Geometry**
Adds moss clusters for depth.

Geometry instancing enables efficient rendering of repeated elements without duplicating geometry, significantly improving performance ([Wikipedia][1]).

**Layer 4: Detail Layer (Optional)**
Adds micro features such as fuzz or sporophytes.

---

### 6.6 Visualization Modes

* Standard shaded
* Wireframe
* Ambient occlusion
* Cel shading
* Debug overlays (growth maps, moisture, light)

Procedural shader techniques allow surface effects to adapt dynamically to geometry without requiring pre-baked textures ([The Gnomon Workshop][2]).

---

### 6.7 Export System

Supports:

* PNG image export
* GIF animation export
* Video export (MP4/WebM)
* Time-lapse generation

---

## 7. User Modes

### Ambient Mode

* Minimal UI
* Continuous passive growth
* Designed for visual display

### Simulation Mode

* Full controls visible
* Adjustable environmental parameters
* Time scaling

### Encyclopedia Mode

* Species inspection
* Scientific data display
* Surface labeling

---

## 8. Technical Architecture

### 8.1 Growth Representation

Growth is stored in a **surface-based grid or texture space**, rather than per-vertex geometry.

Recommended approaches:

* UV-space growth map
* Vertex density map
* Surface sampling grid

---

### 8.2 Simulation Loop

Each simulation step:

1. Evaluate environmental conditions
2. Update health per cell
3. Spread to neighboring cells
4. Apply decay or dormancy
5. Update density values

Simulation runs at a lower frequency than rendering for performance.

---

### 8.3 Rendering Strategy

#### Hybrid Model

* Early growth: shader-based blending
* Medium growth: decals or density-based visuals
* Dense growth: instanced geometry

Procedural moss systems often rely on instancing and masking techniques to maintain performance while achieving visual richness ([Superhive (formerly Blender Market)][3]).

---

### 8.4 Performance Strategy

* Use instancing for repeated geometry
* Separate simulation tick rate from render rate
* Use Level of Detail (LOD) scaling
* Cull off-screen geometry
* Freeze inactive simulation regions
* Use low-resolution simulation maps with visual upscaling

---

## 9. Data Structures

### Growth Cell

```
{
  speciesId,
  density,
  health,
  moisture,
  age,
  dormancyState
}
```

### Species Definition

```
{
  id,
  nameCommon,
  nameScientific,
  type,
  growthRate,
  moisturePreference,
  lightPreference,
  spreadPattern,
  dormancyBehavior,
  visualProfile
}
```

---

## 10. MVP Definition

The first release should include:

* One object (import or built-in)
* One moss species
* Basic growth spread
* Simple environmental influence
* Orbit camera
* Lighting control
* Image export
* Stable performance

---

## 11. Development Phases

### Phase 1: Core Prototype

* Surface analysis
* Basic growth mask
* Camera and lighting

### Phase 2: Environmental Simulation

* Moisture and light influence
* Growth rules

### Phase 3: Rendering Upgrade

* Shader blending
* Instanced moss clusters

### Phase 4: Species Library

* Data structure
* HUD system

### Phase 5: Export Tools

* Image, GIF, video

---

## 12. Risks

* Performance degradation from over-instancing
* Unrealistic growth patterns
* Complex UI overwhelming user
* Poor mesh input quality

---

## 13. Success Criteria

* Smooth real-time performance
* Visually believable growth
* Clear and minimal interface
* Export outputs usable for art and documentation

---


## Closing Thought

What you’re building sits in a rare intersection:
**procedural art, ecology, and interactive systems design.**
