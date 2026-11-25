# Install “Theme toggle” in your workbench

Status: **Design draft**. This is the toggle in this page’s nav bar. It is still a design draft and is not in the app.

Send the prompt below to Claude Code / Codex / T3 Code as is:

```text
Using `stardust-kit/theme-toggle/demo.html`, build a light/dark theme toggle for my nav bar:
1. A 36px icon tile with 11px corners; dark theme shows a violet tile + warm-white sun, light theme shows an indigo tile + pale-violet moon, the two colour layers cross-fading;
2. Sun to moon is one shape: the core circle grows and is cut into a crescent by an offset circle, rays rotate -90° while shrinking and fading, and two small stars fade in; drive it with one 0→1 progress value over 240ms;
3. Hover lifts 1px and deepens the coloured shadow, press scales to 0.92; keyboard focus is a 2px ring with a 3px gap;
4. On touch, grow the hit area to 44×44px without making the nav taller;
5. `aria-label` describes the action (“Switch to light / dark”); do not add `aria-pressed`;
6. Under `prefers-reduced-motion`, switch instantly with no animation.
```
