# KOKE Development

Read [README](README.md) for setup and folder ownership. This repository contains the browser moss simulation and required tests.

- Preserve the radial built-in and graph-backed imported-surface paths. Lifecycle, painting, collisions, spores, render anchors, and export must remain coordinated when changing surfaces.
- Source modules live in `src/`; package-driven regression and browser harnesses live in `tests/`. Keep required test inputs and runtime assets inside the repository.
- From this directory, run `npm run check` and `npm test` before completion. These use Node built-ins; no dependency install is required for those commands. No separate build or lint script is configured.
- This is a static browser app using CDN Three.js and Iconoir; browser loading needs network access. Unit/syntax checks do not verify WebGL rendering. Browser harnesses have additional environment requirements; inspect them before use.
- Follow applicable parent instructions when present. Optional local context is indexed at `../_docs/README.md` in the outer workspace; normal tests and static app inputs must not depend on it. That context may be absent in a clone.
- Keep changes scoped and preserve unrelated worktree changes. Report existing failures and validation limits. Do not restore or stage existing documentation deletions automatically.
