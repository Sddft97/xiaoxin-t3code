# Matrix definition

## Viewports

| Name | Size | Notes |
|---|---|---|
| desktop | 1440x900 @1 | Wide layout; check max-width containers and centred content |
| narrow | 900x800 @1 | Tablet / split window; the breakpoint zone where navs collide and grids reflow |
| mobile | 390x844 @2, touch | Check tap targets (>=36px), no horizontal scroll, safe wrapping |

Add more with a one-line edit to `VIEWPORTS` in `capture-matrix.mjs` (e.g. 320 wide for the smallest phones, 2560 for ultra-wide).

## Language and theme

- Language is usually a different URL (`zh=/,en=/en/`) or a query (`en=/?lang=en`). Verify long strings: Chinese tends to
  fit, German/English labels overflow first.
- Theme applies `colorScheme` (for `prefers-color-scheme` CSS) and sets `html[data-theme]` before scripts run. If your app
  stores theme in localStorage, pass `--theme-key`. If it uses a class (`.dark`), edit the init script in `capture-matrix.mjs`.

## Capture kinds

- `full` full page. `fold` first screen. Then states.
- **Key states** go in `states.json`: `[{"name":"menu-open","steps":[{"click":"#menu"},{"wait":300}],"selector":"#menu-panel"}]`.
  Choose states users actually hit: open menus/dialogs, hover and focus, empty / loading / error / filled, long content,
  selected tab, expanded disclosure, a validation error. Steps DSL: `click hover focus press type wait scroll eval`.
- `selector` clips to one element; without it a viewport screenshot is taken after the steps.

## Naming and layout

```
shots/
  before/  home__zh__dark__desktop__full.png ...
  after/   home__zh__dark__desktop__full.png ...
  compare/ (compare-sheet output, same names)
  manifest.json  (per file: overflowPx, pageErrors)
```

`name` = page or component; `state` = `full`, `fold`, or the state name (kebab-case, no `__`).

## What to look at per viewport

- **Desktop:** alignment to grid, empty-space balance, hover states, wide text measure.
- **Narrow:** nav collisions, cards wrapping to one-and-a-half columns, clipped controls.
- **Mobile:** horizontal overflow (the manifest reports `overflowPx > 1`), text size, tap targets, fixed bars covering content,
  100vh issues, notch safe areas.
- **Both themes:** contrast of secondary text, borders disappearing, shadows, images with baked-in backgrounds.
- **Both languages:** wrapping, truncation, mixed-script spacing, fonts falling back.

## Known limits

Playwright Chromium is not Safari: report that real-device Safari/Firefox were not checked unless they were.
Full-page captures of very tall pages (>16k px at @2x) may be truncated by Chromium; use `fold` + states instead.
