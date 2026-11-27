/* Slow-motion review helper. Paste into DevTools console, or inject with page.addInitScript({path}).
 * Affects CSS transitions, CSS animations and Web Animations (WAAPI), including ones that start later.
 * It does NOT slow requestAnimationFrame / canvas / setTimeout driven motion; use the CSS-variable
 * multiplier below (or the project's own time scale) for those.
 *
 *   slowmo(0.25)  // quarter speed
 *   slowmo(1)     // restore
 *   slowmo(0)     // pause everything; scrub with: document.getAnimations().forEach(a => a.currentTime += 16)
 */
(() => {
  let rate = 1,
    raf = 0;
  const apply = () => {
    for (const a of document.getAnimations({ subtree: true }))
      if (a.playbackRate !== rate) a.playbackRate = rate;
    raf = rate === 1 ? 0 : requestAnimationFrame(apply);
  };
  window.slowmo = (r) => {
    rate = r;
    cancelAnimationFrame(raf);
    apply();
    if (r !== 1) raf = requestAnimationFrame(apply);
    return `slowmo ${r}`;
  };
})();

/* Variant B, CSS multiplier. Works for everything driven by the tokens, including rAF code that reads them.
 * 1) Define tokens through one multiplier:
 *      :root { --motion-scale: 1; --motion-hover: calc(120ms * var(--motion-scale)); ... }
 * 2) Slow down from the console:
 *      document.documentElement.style.setProperty('--motion-scale', 4)    // 4x slower
 * Script-driven code should read it:  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale')) || 1
 */
