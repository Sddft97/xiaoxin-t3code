# Install “Galaxy effort slider” in your workbench

Status: **In Stardust**. The effort slider the current app ships.

Send the prompt below to Claude Code / Codex / T3 Code as is:

```text
Using `stardust-kit/galaxy-effort-slider/` (`GalaxyEffortSlider.tsx`, `galaxyEffortCanvas.js`, `galaxyEffort.css`, `galaxyEffortLevels.ts` and `demo.html`), install the “galaxy effort slider” in my workbench’s reasoning-effort picker:
1. Keep five levels (Low · Medium · High · XHigh · Max); each level changes star density, nebula colour and the burst when you arrive;
2. Keep the control a single 32px galaxy band so the popover height does not change;
3. Use `role="radiogroup"` with arrow keys and Home/End, and honour `prefers-reduced-motion` by switching levels without the burst;
4. Stop the canvas loop when the page is hidden or after about 2 seconds idle;
5. If the project has no `STARDUST_STAR_PATH`, substitute your own star Path, then run lint, typecheck and the existing slider tests.
```
