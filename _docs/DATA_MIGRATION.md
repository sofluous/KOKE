# DATA MIGRATION

KOKE does not persist simulation state, so there is no data migration between releases.

Surface import accepts self-contained binary GLB files. On import, KOKE:

1. Reads triangle meshes and applies their node transforms.
2. Rejects files without mesh geometry or above 10,000 triangles.
3. Centers and uniformly scales the combined geometry.
4. Welds matching vertices and builds triangle adjacency, component and topology metadata.
5. Creates graph-backed lifecycle, rendering, collision and spore state for the imported topology.
6. Activates the new imported runtime while retaining the built-in radial runtime for later restoration.

Imported files remain in browser memory for the current session only. Reports include current UI and diagnostic state, while image export contains rendered pixels rather than model or simulation data. `importMeshGraphGlb` extracts folded, porous, open and disconnected topology and validates geometry/graph face identity; `GraphSimulationAdapter` carries lifecycle state and accepts face-index brushes; mesh render anchors retain triangle/barycentric attachment; collision hits resolve to the same identity; `createGraphRenderer` consumes those contracts; and graph spores use accelerated segment collision. There is no persisted state to migrate from the former radial-only import path.
