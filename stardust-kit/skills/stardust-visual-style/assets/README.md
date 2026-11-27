# Brand assets: T2 ringed-star mascot 星宝 (MIT, Stardust project)

| File                                                                  | Use                                                                                            |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `svg/stardust-icon.svg`                                               | Master app icon, 1024 canvas with standard macOS margin                                        |
| `svg/stardust-icon-square.svg`                                        | Full-bleed square (website, avatars, store art)                                                |
| `svg/stardust-icon-small.svg`, `stardust-icon-small-square.svg`       | **16-48 px**: eyes made thicker, details merged                                                |
| `svg/stardust-flat-light*.svg`, `stardust-flat-dark*.svg`             | Flat single-colour (`#3b2fd0` family): print, embroidery, engraving, black-and-white docs      |
| `stardust-icon-animated.svg`                                          | Dust orbits the ring, blink every ~4 s (website, splash). Stops under `prefers-reduced-motion` |
| `png/stardust-icon-512.png`, `png/stardust-flat-{light,dark}-512.png` | Quick-look previews                                                                            |

Design: purple-night base + self-lit soft-white star + two vertical pill eyes with glints + Gaussian-blurred glow ring + few
specks. No mouth, blush or other expressions baked in: expression only ever changes the eyes.

Colours: base `#1c1840` to `#07061a`; star `#ffffff` to `#d4ccff`; inner light `#8d7dff`; eyes `#2f3cc4`; flat `#3b2fd0`.

Need `.icns`, `.ico`, favicons or 192/512 PNGs? Export from the SVG masters (see `stardust-kit/stardust-icon/` for the full set).
