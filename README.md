# KOKE

Browser-based moss simulation with procedural built-in surfaces, graph-backed GLB imports, painting, spores, and still-image export.

Serve this directory with a static HTTP server and open `index.html`. For example, with Python 3 available:

```text
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. Browser runtime dependencies (Three.js and Iconoir) load from CDNs; internet access and WebGL support are required. Stop the server with Ctrl+C.

From this repository directory, using a current Node.js release and npm (validated with Node 24.14.1):

```text
npm run check
npm test
```

These syntax/unit gates require no package installation. There is no configured build step or separate lint command. Browser harnesses require additional browser/server setup and are not executed by `npm test`.

| Path | Ownership |
| --- | --- |
| `index.html`, `src/`, `design-system/` | Static application entry point, runtime modules, styles, and bundled theme assets |
| `tests/`, `package.json` | Required development checks and browser harnesses; keep versioned with the app |
| `.browser-audit/` | Ignored generated local browser artifacts |
| `AGENTS.md` | Product-specific engineering guidance |

Deploy intended static application files; tests and local browser captures are development inputs. No hosting provider configuration is supplied here; Git ignore rules alone do not control uploads. Preserve the directory layout and runtime URLs.

Optional development history and plans live at `../_docs/README.md` in the full local workspace. They are not needed to serve the app or run normal tests and may be absent in a clone.
