# Blossoms afloat.

A single-page, backend-free pool toy built with native HTML, CSS, and JavaScript. The pool is drawn using a custom WebGL shader; original transparent flower cutouts are included with the source and in `public/flowers/` so the static output is self-contained. The app prefers the project’s `/manus-storage/` copies and falls back to the bundled files when served elsewhere.

## Run locally

```sh
python3 -m http.server 3000 --bind 127.0.0.1 --directory public
```

Open the local server in a WebGL-capable browser. No package installation or build step is required.

## Play

Choose one of the four flowers, then tap or click the pool to drop it. Drag a blossom to steer it, reverse direction quickly to shake off droplets, or press and hold to dip it below the surface. Use **Clear the water** to sink the flowers gently. Keyboard users can focus the pool to drop at its center and use arrow keys to move a focused blossom.

## Rendering and interactions

The background is a full-screen WebGL 1 canvas. Its fragment shader bends two animated wave fields into intersecting caustic lines, with a soft illumination field and small glints over a teal base. A CSS sheen and vignette sit above the canvas. If WebGL cannot start or its context is lost, a CSS water texture remains visible.

Flowers are accessible DOM buttons rather than sprites baked into the canvas. A shared animation loop updates drift, damping, buoyancy, edge limits, gentle landing bounce, and pairwise nudges. Pointer Events support mouse and touch. A drag release carries momentum; repeated quick reversals create shake droplets and ripples; a stationary hold dips a flower below the surface. Clear uses staggered sink/fade timings, and a second click does not restart a flower already clearing.

## Artwork and fallbacks

Original transparent 1920×1920 PNG cutouts live in `source/flowers/`. Their optimized 720×720 derivatives are in `source/flowers/web/` and the standalone site's `public/flowers/`. The managed site tries project-storage image URLs first; if they fail, `data-fallback` switches the picker or floating blossom to its local `/flowers/<name>.png` image. This means a plain static host does not need the Manus storage service.

Fonts use Newsreader, DM Sans, and Caveat when Google Fonts are reachable, with Georgia/system/cursive fallbacks. No package, font, or backend dependency is required to start the site.

## Accessibility and performance notes

Picker choices expose their selected state with `aria-pressed`; floating flowers have descriptive button labels, and the status/hint regions announce changes politely. The pool can be used with Enter/Space and focused flowers can be repositioned with arrow keys. Reduced-motion preferences freeze ambient water movement, limit blossom animation, and skip the clear sink animation.

The canvas uses a conservative device-pixel-ratio scale to limit GPU fill cost. A managed Preview sample reported approximately 17–22 `requestAnimationFrame` callbacks per second, and remained around 19 when the WebGL draw call was bypassed, suggesting the Preview scheduler affected the measurement. A 60fps cadence has not yet been verified on physical desktop/mobile devices; see [the architecture notes](docs/architecture.md) before tuning shader scale or motion.

## Further documentation

See [docs/architecture.md](docs/architecture.md) for the render loop, interaction states, accessibility and the known verification limit.

## Source layout

- `public/index.html` — page structure, controls, and metadata.
- `public/style.css` — glass UI, responsive layout, flower layering and motion.
- `public/app.js` — WebGL caustics shader and interaction/physics loop.
- `public/manus-routes.json` — static page route declaration.
- `public/flowers/` — optimized transparent cutouts included in the static site.
- `source/flowers/` — original generated 1920×1920 transparent cutouts and optimized 720×720 derivatives.
- `source/blossoms-mark.png` — original project icon.
