# Mascot 星宝 (T2 "ringed star")

## Anatomy

1. **Star:** soft white rounded five-point star, self-lit (white to `#d4ccff`, inner light `#8d7dff`), gentle Gaussian edge.
2. **Eyes:** two vertical pill shapes (`#2f3cc4`) with small glints. They are the only face.
3. **Ring:** a blurred light ring orbiting the star; the **back half passes behind** the star and the **front half in front**.
4. **Stardust:** a few small specks and 4-point sparkles; never a crowd.

## Never

- No mouth, no blush, no eyebrows, no limbs, no outline stroke, no hard 3D, chrome or glossy plastic.
- No redrawing from memory or screenshots; use `assets/svg/*`.
- No size-dependent hacks: choose the right variant.

## Variants and sizes

| Size | Use |
|---|---|
| >= 64 px | `stardust-icon.svg` / `-square.svg` |
| 16-48 px | `stardust-icon-small*.svg` (thicker eyes, merged specks) |
| Print/mono | `stardust-flat-light*.svg` / `stardust-flat-dark*.svg` |
| Motion | `stardust-icon-animated.svg` |

The kit's `.icns` uses the small variant for 16 and 32. Always eyeball at 16, 32 and 64 px before shipping.

## Expressions (eyes only)

Express state by changing the eyes: wider/taller (alert), narrower (calm, sleepy), glints moving (looking), a short blink.
Use sparingly: idle blink about every 4 s; one distinct expression per state. Emoji/sticker sets may extend this, still
eyes-only. The site mascot may glide along the scroll path and look toward text; it never moves during typing or drag.

## Animation (animated SVG)

- Dust orbits along the ring; blink every ~4 s.
- Under `prefers-reduced-motion: reduce`, motion stops and a static frame shows.
- Keep any extra loop at ambient rhythm (see `stardust-motion-audit/references/tokens.md`: ambient and mascot tokens).

## Placement

Corner of the sidebar (star mark with a gentle gradient at its lower right), app icon, website hero, empty states, splash.
Keep clear space equal to the eye height on every side. Do not place on busy backgrounds without the night tile.
