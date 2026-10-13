# Blossoms afloat.

A single-page, backend-free pool toy built with native HTML, CSS, and JavaScript. The pool is drawn using a custom WebGL shader; original transparent flower cutouts are included with the source and in `public/flowers/` so the static output is self-contained. The app prefers the project’s `/manus-storage/` copies and falls back to the bundled files when served elsewhere.

## Run locally

```sh
python3 -m http.server 3000 --bind 0.0.0.0 --directory public
```

Open the local server in a WebGL-capable browser. No package installation or build step is required.

## Play

Choose one of the four flowers, then tap or click the pool to drop it. Drag a blossom to steer it, reverse direction quickly to shake off droplets, or press and hold to dip it below the surface. Use **Clear the water** to sink the flowers gently. Keyboard users can focus the pool to drop at its center and use arrow keys to move a focused blossom.

## Source layout

- `public/index.html` — page structure, controls, and metadata.
- `public/style.css` — glass UI, responsive layout, flower layering and motion.
- `public/app.js` — WebGL caustics shader and interaction/physics loop.
- `public/manus-routes.json` — static page route declaration.
- `public/flowers/` — optimized transparent cutouts included in the static site.
- `source/flowers/` — original generated 1920×1920 transparent cutouts and optimized 720×720 derivatives.
- `source/blossoms-mark.png` — original project icon.
