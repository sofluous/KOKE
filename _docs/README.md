# KOKE Docs Index

This folder tracks product intent, delivery stages, and quality checks for the moss simulation prototype.

## Current delivery
- [Studio proposal and staged delivery](STUDIO_PROPOSAL.md): UI organization, models, moss styles, and exports; Stage 1 authorized.
- [Moss redesign delivery notes](data/MOSS_IMPLEMENTATION_2026-09-11.md): behavior, usage, checks, images, and limitations.
- [Graph simulation adapter](data/GRAPH_SIMULATION_ADAPTER_2026-10-02.md): topology-general lifecycle state contract and staged integration boundary.
- [Mesh render anchors](data/MESH_RENDER_ANCHORS_2026-10-04.md): stable triangle/barycentric attachments and lifecycle buffer mapping.
- [Mesh collision adapter](data/MESH_COLLISION_2026-10-04.md): face-identity validation and ray-hit conversion for graph interaction.
- [Graph renderer](data/GRAPH_RENDERER_2026-10-20.md): lifecycle-driven surface and instanced rendering for topology-general meshes.
- [Graph spores](data/GRAPH_SPORES_2026-10-20.md): accelerated mesh collision and species-preserving particle lifecycle.
- [General-model runtime](data/GENERAL_MODEL_RUNTIME_2026-10-22.md): coordinated UI activation, Chrome coverage and remaining performance work.
- [Near-limit graph performance](data/GRAPH_PERFORMANCE_REVIEW_2026-10-22.md): deterministic 9,350-triangle workload, synchronous/chunked/staged lifecycle measurements and optimization priorities.
- [Model-aware imported defaults](PRODUCT.md#model-aware-imported-defaults---2026-10-28): bounded surface-area scaling for moss, spores and brush interaction.
- [Surface-first graph allocation](PRODUCT.md#surface-first-graph-allocation---2026-10-28): zero-anchor Surface imports and on-demand Low/High geometry.
- Current regression commands: `npm test` and `npm run check`.
- The audit/probes below are the historical baseline before the redesign.

## Latest audit
- [Moss rendering and growth audit (2026-09-10)](data/MOSS_RENDERING_AUDIT_2026-09-10.md): active-code defects, reference analysis, staged visual improvements, and acceptance criteria.
- [Reproducible field probes](data/audit-field-probes.mjs) and [captured results](data/AUDIT_FIELD_PROBES_2026-09-10.json).

## Update rules
- Update `CHANGELOG.md` for every implementation task.
- Update `QA.md` whenever testing scope changes.
- Record assumptions and architectural decisions in `PRODUCT.md`.
