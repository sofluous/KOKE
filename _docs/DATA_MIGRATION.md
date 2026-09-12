# DATA MIGRATION

KOKE does not persist simulation state, so there is no data migration between releases.

Surface import accepts self-contained binary GLB files. On import, KOKE:

1. Reads triangle meshes and applies their node transforms.
2. Rejects files without mesh geometry or above 10,000 triangles.
3. Centers and uniformly scales the combined geometry.
4. Validates that the model is closed and star-shaped with at least 98% radial coverage.
5. Builds a cached radial sampler and replaces the active propagation surface while preserving the UV growth field and clearing in-flight spores.

Imported files remain in browser memory for the current session only. Reports include current UI and diagnostic state, while image export contains rendered pixels rather than model or simulation data. Folded, porous, open and disconnected models require a future topology-general import path.
