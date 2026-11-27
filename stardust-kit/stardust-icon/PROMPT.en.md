# Install “Ringed-star icon” in your workbench

Status: **In Stardust**. Stardust’s app icon (T2); the in-app star mark lives in StardustMark.tsx.

Send the prompt below to Claude Code / Codex / T3 Code as is:

```text
Using the SVG icon set and `demo.html` in `stardust-kit/stardust-icon/`, make your own “ringed star” style icon set for my project (swap in your own shape if you like):
1. Main icon: 1024 canvas, an 824 rounded tile in a violet night gradient (#1c1840 → #07061a), a self-lit soft-white star in the middle (#ffffff → #d4ccff), a Gaussian-blurred glow ring around it and a few specks of dust;
2. A 16–48px variant with merged details and bolder lines;
3. Flat one-colour variants (light and dark backgrounds) for print and black-and-white documents;
4. An animated SVG: dust drifts around the ring and the eyes blink every 4 seconds, stopping under `prefers-reduced-motion`;
5. Export `.icns`, `.ico`, favicons and 192/512 PNGs, and check clarity by eye at 16, 32 and 64px.
```
