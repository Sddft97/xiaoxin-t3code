# Stardust theme colors · v1.2.4

These values apply when the desktop app uses `data-theme-id="stardust"`. The website and standalone workshop demos have their own styles. [Released stylesheet](https://github.com/zds-xiaoxin/stardust/blob/v1.2.4/apps/web/src/themes/stardust.css)

| Workbench token | Light | Dark |
|---|---|---|
| `--stardust-accent` | `#5b4be0` | `#6a5af0` |
| `--stardust-accent-hover` | `#4a3bc8` | `#7c6dfa` |
| `--stardust-focus` | 16% of the light accent | 25% of `#8d7dff` |
| `--info` | `#0a84ff` | `#0a84ff` |
| `--info-foreground` | `#0062cc` | `#64b5ff` |

In the dark workbench, fill and hover use `rgb(160 150 210 / 13%)` and `21%`. Lines and hairlines use `rgb(235 232 255 / 11%)` and `7%`. The secondary surface is `#25232f`. Strong glass uses `rgb(30 29 39 / 96%)`.

## Composer and approvals

The send accent is `#5b4be0` in both themes. The composer, shell and session-stats popup set their own primary color (`#e34717` light, `#ff6734` dark). In dark mode their background is `#1c1c1e`, raised surface `#2a2a2d`, foreground `#f5f5f7` and secondary text `#aaaab3`.

The approval trail’s accept button and checked switches, checkboxes and radio indicators use the workbench accent with white text or marks. The composer’s default outline uses black at 6% / 10% when focused in light mode and white at 8% / 13% in dark mode. The `b0` border setting uses the focus color. The `b2` setting adds an outline at 14% of the workbench accent.
