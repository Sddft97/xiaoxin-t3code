# Palette

## Brand kit (mascot and icon)

| Name | Value | Where |
|---|---|---|
| Night top | `#1c1840` | Icon tile / website backdrop top |
| Night bottom | `#07061a` | Icon tile / website backdrop bottom |
| Star | `#ffffff` to `#d4ccff` (top to bottom, soft) | Star body |
| Inner light | `#8d7dff` | Glow inside the star, ring tint, dark-theme accent text/line |
| Eyes | `#2f3cc4` | The two pill eyes |
| Flat | `#3b2fd0` | Single-colour marks |

Background gradient: `radial-gradient(90% 70% at 50% 0%, #1c1840 0%, #07061a 80%)` is the standard kit-demo and website backdrop.

## In-app accent (Stardust v1.2.4)

| | Light | Dark |
|---|---|---|
| Accent | `#5b4be0` | `#6a5af0` |
| Accent hover | `#4a3bc8` | `#7c6dfa` |
| Focus ring | accent 16% | `#8d7dff` 25% |

Composer surfaces have local overrides listed in [the released theme colors](theme-v2.md).

Accent text on dark panels in demos: `#b3a8ff`. Success/warn colours are standard status colours, not purple.

## Surfaces

- **Light = Apple-neutral:** page `#f5f5f7`, surface `#fff`, text `#1d1d1f`, secondary `rgba(60,60,67,.74)`, hairlines
  `rgba(0,0,0,.09-.10)`. Purple only as small accents.
- **Dark = slight purple night:** fills like `rgba(160,150,210,.13)` (hover `.21`), lines `rgba(235,232,255,.11)`, hairline
  `.07`. Kit demos use `#0b0a1f` page, `#171538` surface, text `#f2f0ff`, secondary `rgba(212,204,255,.72)`.
- Borders are hairlines; shadows are diffuse and low alpha. The composer uses a neutral 1 px (0.5 px on 2x) line, with an
  optional faint accent focus outline.

## Rules

- Do not introduce new purples. If you need a tint, derive it with `color-mix` from the accent or the inner-light value.
- Accent covers at most a few controls per screen (see `theme-v2.md`). A screen full of purple is wrong.
- Check contrast: text >= 4.5:1, large text and icons >= 3:1, in both themes. Accent-on-accent-tint fails often; test it.
- Dark-only website: keep the backdrop gradient above; text `#f2f0ff`, secondary `rgba(212,204,255,.74)`, faint `.55`.
