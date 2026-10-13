# TODO

- [x] **Pool water and caustics.** Full-screen realistic pool water with animated caustics (a web of bright white-cyan light lines and sparkling highlights over a turquoise/teal base, around #73b8bf), implemented as a WebGL shader. WebGL loss/failure has a softly animated CSS-water fallback.
- [x] **Flower cutouts and shadows.** Four flowers: pink hibiscus, bright (magenta) hibiscus, white lily, plumeria. They look like realistic photo cutouts with transparent backgrounds. Each flower casts a soft, offset, blurred shadow on the pool floor that wobbles with the caustics.
- [x] **Drop and touch response.** Pick a flower from the panel, then tap/click the pool to drop it in with a splash, ripple, and small bounce. A soft glassy ring ripple expands around a flower when it lands or is touched.
- [x] **Flower play.** Drag a flower around; it glides with inertia and water drag, then drifts, bobs, and rotates slowly. Shake a flower (rapid back-and-forth dragging) to fling off droplets and send ripples, as if shaking out the water it holds. Press and hold to push a flower under the surface (it shrinks, tints, and blurs), then it pops back up with a ripple. Flowers nudge each other on collision.
- [x] **Clear action.** "Clear the water" gently sinks or fades all flowers.
- [x] **Frosted-glass UI and microcopy.** Use frosted glass, rounded corners, and backdrop blur. Top-left: large title "Blossoms" in an elegant serif (Newsreader or Fraunces), dark navy, with "afloat." on the second line in italic. Top-right panel: a 2x2 grid of pill buttons with tiny flower icons (Pink hibiscus, Bright hibiscus, White lily, Plumeria). The selected one gets a soft teal highlight. Below a thin divider, a full-width white rounded "Clear the water" button. Bottom-center pill with the hint "Pick a flower to drop it in the pool" in a casual handwritten-style font. After a flower is picked, change it to a short hint about tapping the water and dragging, shaking, or holding. Do NOT include any third-party branding or credits from the original.
- [~] **Responsive motion and browser behavior.** Smooth 60fps, devicePixelRatio-aware, works with mouse and touch, fully responsive on mobile, respects prefers-reduced-motion. The site uses a lean, DPR-aware WebGL shader and responsive touch/mouse controls. The managed Preview's frame scheduler sampled at about 17–22fps, including 19fps with WebGL drawing temporarily bypassed, so the Preview environment prevented verification of a 60fps display cadence on actual user hardware.
- [x] **Delivery shape.** Single-page static site with no backend. Test it in the browser yourself. Check that the water animates, all four flowers drop, and drag, shake, and press-under all work, and fix anything that looks flat or broken before delivering.

## Browser validation notes

- Managed Preview loaded all four original `/manus-storage/` flower images; all four varieties were selected and dropped into the pool.
- Pointer-event checks confirmed drag movement, shake droplets and ripple, a submerged state after a hold, and the pop-back state on release.
- Clear began its staggered fade/sink and completed with zero remaining flowers.
- Desktop and mobile screenshots were reviewed; the root route, route manifest, JavaScript syntax, and four bundled 720×720 RGBA flower fallback assets were verified.
- The 60fps display target remains hardware/browser-scheduler dependent and was not verified in this managed Preview (see the motion item above).
