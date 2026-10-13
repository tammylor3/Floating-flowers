# Architecture notes

## Runtime shape

The experience is a static page with no server-side application code. `public/index.html` loads the stylesheet and one vanilla-JavaScript module. A full-screen `<canvas>` paints the water; flowers, shadows, ripples, droplets, the picker, wordmark, and status hint are DOM elements layered above it. The transparent pool button receives taps/clicks where there is no flower or control.

The project does not require a package manager or build tool. Its static output is the `public/` directory, and `public/manus-routes.json` declares `/` as the only page route.

## Water rendering

`startWater()` in `public/app.js` requests a WebGL 1 context. The fragment shader works in normalized viewport coordinates and time-warps two crossing sine-wave fields. Their contours create the moving caustic web; a broad light field and sparse high-frequency glints add depth and sparkle. The shader uses medium fragment precision and has no per-pixel neighborhood search loop.

The canvas pixel ratio is scaled from the display's `devicePixelRatio` and capped to reduce fill cost on high-resolution screens. CSS stretches the backing canvas to the viewport. The shader's time uniform is frozen under `prefers-reduced-motion`; the page also avoids unnecessary water redraws in that mode. If WebGL is unavailable, fails to compile/link, or the context is lost, the `.no-webgl` class reveals the animated CSS-water treatment instead of leaving a flat canvas.

`water-sheen` and the pool vignette are separate CSS layers. Flower floor shadows are DOM ellipses: their offset and scale respond to a local time/position phase, making them waver in step with the changing water field without sampling the WebGL canvas.

## Flower model and interaction flow

Each flower is an accessible button backed by one object in the `flowers` array. Its position, velocity, size, rotation, bob phase, drag state, submerge state, and clear timing are updated on a shared `requestAnimationFrame` loop. The loop applies water-like damping, weak drift, screen-edge bounds, a small landing bounce, and pairwise overlap correction that nudges blossoms apart.

1. **Select:** a picker button updates the selected flower type, pressed state, and hint.
2. **Drop:** a pointer press on the pool button creates that flower at the pointer position, clamps it to the safe viewport area, emits landing droplets, and starts ring ripples.
3. **Drag:** a flower captures its pointer and follows pointer movement. On release, its velocity continues under damping so it glides rather than stopping abruptly. Competing pointer presses are ignored while another flower gesture is active.
4. **Shake:** repeated fast direction reversals during a drag emit a burst of small droplets and another ripple.
5. **Submerge:** a stationary hold adds `.is-submerged`, shrinks and tints/blurs the flower, and dims its shadow. Releasing restores the surface state, upward motion, and a ripple.
6. **Clear:** each flower receives a staggered sink/fade timestamp and is removed when its animation finishes. Repeated activation does not restart an already-running clear.

Ripples and droplets are small CSS-animated elements. `prefers-reduced-motion` disables ambient flower bob/spin and landing bounce, freezes the shader, and removes flowers immediately on clear. User-directed movement remains available.

## Input and accessibility

Mouse and touch both use Pointer Events; the app relies on one active pointer gesture at a time. Buttons retain native focus/activation behavior. Picker selection is exposed through `aria-pressed`; each floating blossom has a descriptive accessible name; the hint/announcement regions use polite live updates. Keyboard users can drop from the focused pool and reposition a focused blossom with arrow keys.

The scene is fixed to the viewport and uses safe-area insets for mobile hint placement. CSS breakpoints move the picker below the wordmark on narrow screens and reduce newly created flower size for the tighter pool area.

## Artwork and fallback paths

- Original transparent cutouts: `source/flowers/{pink,magenta,lily,plumeria}.png`.
- Optimized 720×720 derivatives: `source/flowers/web/`.
- Self-contained site copies: `public/flowers/`.

In the managed environment, picker and floating-flower images try `/manus-storage/...` first and switch to the bundled `/flowers/...` path on load failure. The fallback paths are relative to the site origin, so they also work on a plain static host. No user content or runtime state is persisted.

## Verification and known limit

A manual browser pass checked all four selections/drops, drag displacement, shake droplets/ripple, the held underwater state and release, and the clear-to-empty sequence. Desktop and 375×812 mobile captures were inspected. JavaScript syntax, the route JSON, and the local flower files were checked. The managed Preview reported roughly 17–22 requestAnimationFrame callbacks per second, with only a small change when WebGL drawing was bypassed; its own scheduler may be the bottleneck. Physical-device 60fps performance remains to be profiled before making a stronger performance claim.

When changing the shader's rendering ratio, compare both caustic line sharpness and frame cadence on actual mobile and desktop GPUs. If changing the page route, keep `public/manus-routes.json` synchronized with the static page set.