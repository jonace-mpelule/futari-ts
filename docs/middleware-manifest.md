---
title: Middleware Manifest
---

# Middleware Build Manifest

Middleware is attached through `@Use(fn)` on route handlers.

During `BuildManifest(root)`, Futari bundles each `src/routes/**/+route.ts`
entry, imports the built chunks, reads the static route metadata produced by the
decorators, and emits `.futari/manifest.js`.

The generated manifest imports the bundled route classes and resolves middleware
from each class's `__futari_middlewares` metadata at runtime. This keeps
middleware callable without serializing functions into source text.
