---
name: stardust-visual-style
description: >-
  Stardust (星尘) visual identity for anyone building skins, themes, mascot art, mockups, kit components or the product
  website for the Stardust desktop workbench: palette, the 星宝 (Xingbao) mascot rules, soft self-glow look, mockup and
  website rules, and what Theme v2 actually ships. Use when asked to "design for Stardust", "make a Stardust theme/skin",
  "draw/animate the mascot 星宝", "make a mockup of a Stardust screen", "does this match the Stardust look", or in Chinese:
  "星尘视觉规范", "星尘配色", "星宝形象/表情", "星尘主题/皮肤", "做星尘界面稿", "官网风格", "这个图标/组件符不符合星尘风格".
  Stardust-specific; for generic motion or screenshot work use the other skills.
---

# Stardust Visual Style

Authored by the Stardust project, MIT License (assets in `assets/` are the project's own brand kit under the same license).
Names: marketing name 星尘 Agent / Stardust Agent; in the app the product shows as 星尘 / Stardust.

## Look in one paragraph

Calm, restrained, soft. Light is **Apple-neutral** (white/warm-grey surfaces, hairline borders); purple appears only as a
small accent. Dark is a slightly purple night with subtle stars. Things glow softly from within and edges are blurred
(Gaussian), never hard 3D, metallic, glossy-plastic, neon-grid or generic "AI card" gradients. Attention belongs on the composer
(the input), so decoration stays quiet.

## Palette (brand kit)

| Role                                       | Value                                               |
| ------------------------------------------ | --------------------------------------------------- |
| Purple night (icon/background gradient)    | `#1c1840` to `#07061a`                              |
| Star body gradient                         | `#ffffff` to `#d4ccff`                              |
| Inner light                                | `#8d7dff`                                           |
| Eyes                                       | `#2f3cc4`                                           |
| Flat single-colour (print/embroidery/mono) | `#3b2fd0`                                           |
| In-app accent, light / dark                | `#5b4be0` / `#6a5af0` (hover `#4a3bc8` / `#7c6dfa`) |

Details, usage and contrast notes: `references/palette.md`.

## Mascot 星宝 (T2 "ringed star")

- A soft white **rounded five-point star**, self-lit, with **two vertical pill eyes** and small eye glints.
- Orbited by a **blurred light ring**: the back half is behind the star, the front half in front. A few stardust specks.
- **No mouth. No blush. Expressions come only from the eyes** (size, shape, glints, a blink). Do not add limbs or a face.
- Sizes: use the **small variant** (thicker eyes, merged details) at 16/32 px; never scale the 1024 master down to favicon size.
- Flat single-colour light and dark versions exist for print and monochrome.
- Assets: `assets/svg/` (masters, small, flat), `assets/stardust-icon-animated.svg` (dust orbiting the ring, blink every ~4 s,
  stops under `prefers-reduced-motion`), `assets/png/` (512 previews). Rules and expression guidance: `references/mascot.md`.

## Hard rules

1. **Mockups render inside the real Stardust UI shell.** Use the real settings shell, tokens, spacing, fonts and components.
   Never mock Stardust in a generic, other-platform or "Dribbble" look. If you cannot reproduce the shell, say so and use a
   real screenshot as the base. See `references/mockups.md`.
2. **Website: dark-only, one idea per section, restrained.** Purple-night backdrop with subtle stars; one message, one visual
   per section; no card grids of features; motion is quiet and tokenised (see `stardust-motion-audit`). `references/website.md`.
3. **Light theme is not "dark inverted".** Neutral surfaces, accent only on a handful of controls (send button, primary
   action, on-state of switch/checkbox/radio, focus, star mark corner). Dark: slight purple tint on fills, accent a bit brighter.
4. **Soft over sharp.** Glow and shadow are diffuse; borders are hairline (0.5-1 px, low alpha). No metallic gradients.
5. **Use real originals.** Reuse the SVG masters; do not redraw or "approximate" the mascot.
6. **Bilingual.** Anything user-facing ships in 中文 and English.
7. **Privacy:** no real user names, emails, paths or account data in demos or mockups. Use sample data.

## Checklist before delivering a design

- [ ] Colours come from the palette table (or the shipped theme tokens), nothing invented.
- [ ] Mascot is a supplied SVG, correct variant for its size, no mouth/blush.
- [ ] Attention goes to the composer / primary action; decoration is subtle.
- [ ] Light and dark both checked; light is neutral with small purple accents.
- [ ] Mockup sits in the real shell; website page is dark-only and single-idea per section.
- [ ] Motion uses shared tokens and respects `prefers-reduced-motion`.
- [ ] zh + en copy present.

## Files

- `references/palette.md` – colours, gradients, accent map, contrast.
- `references/mascot.md` – anatomy, variants, sizes, expressions, animation, what not to do.
- `references/mockups.md` – the real-shell rule and how to do it.
- `references/website.md` – website rules.
- `references/theme-v2.md` – what Theme v2 actually shipped (accent map, tokens, composer border).
- `assets/` – SVG masters, animated SVG, 512 PNG previews, `assets/README.md`.
