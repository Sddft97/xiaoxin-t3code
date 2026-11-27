# State-change inventory template

Copy this table. One row per state change. Rows with no motion at all are findings, not blanks.
Columns: trigger → what moves → duration/curve → problem → fix.

| #   | Trigger | What changes (what moves) | Now: duration / curve | Problem (what the user sees) | Fix → token |
| --- | ------- | ------------------------- | --------------------- | ---------------------------- | ----------- |
| 1   |         |                           |                       |                              |             |

Add three notes per row when relevant: **interrupt** (what if re-triggered mid-way?), **reduced motion** (what remains?),
**viewport/theme** (does it hold on mobile, narrow, dark and light?).

## Categories to sweep (tick each at least once)

appear · disappear · move/reorder · resize/expand/collapse · content swap · icon/glyph swap · number change ·
press · hover · focus · drag/drop · load · complete · error · empty→filled · theme switch · language switch ·
page/route change · scroll reactions · ambient loops.

## Worked rows (illustrative, adapted from real audits)

| #   | Trigger                    | What changes                              | Now                                            | Problem                                                                 | Fix → token                                                                                                     |
| --- | -------------------------- | ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Page load                  | Icon, title, buttons enter                | 520/600 ms, custom curves                      | Opacity and offset finish at different times, feels two-step            | One 480 ms `reveal`, keep order stagger                                                                         |
| 2   | Hover on a button          | Colour, tag                               | 200 ms ease                                    | Slow; colour lags the pointer                                           | `hover` 120 ms; press `press` 80 ms; focus ring stays instant                                                   |
| 3   | Select a tab               | Tab highlight, panel text, action buttons | 200 ms ease + 350 ms custom entry              | Slow fade interrupts quick browsing; reselecting reloads                | `hover` for highlight, `swap`-class 160 ms for panel text; re-select is a no-op                                 |
| 4   | Drag an item               | Drag ghost, slot hint, drop settle        | 200–250 ms ease; 500 ms overshoot              | Ghost inherits transition and lags the pointer; settle bounces too much | Ghost follows pointer with no transition; slot hint `hover`; settle `pop` 240 ms two-frame                      |
| 5   | Copy button                | Label and status colour                   | Instant, 1800 ms hold                          | Late async copy result can write back after the user left               | Skip feedback if node detached; keep colour on button timing                                                    |
| 6   | Counter appears            | Number counts 0 → 14                      | 900 ms cubic                                   | The number briefly shows a false value                                  | Show the true value immediately                                                                                 |
| 7   | Expand an index            | Height, opacity, chevron                  | height jumps; chevron 180 ms                   | Content teleports                                                       | `expand` 240 ms / collapse `exit` 180 ms; collapsed content `inert`                                             |
| 8   | Switch theme               | Sun/moon glyph, page colours              | 180–250 ms mixed                               | Icon feel and press timing disagree                                     | Glyph morph 240 ms `expand`, press 80 ms; page colours commit instantly                                         |
| 9   | Row leaves a list          | Row, neighbours                           | row vanishes, neighbours jump                  | Teleport                                                                | Row `exit` 180 ms; neighbours glide (FLIP, `enter` 220 ms), or trailing row folds height (documented exception) |
| 10  | Tooltip open/close rapidly | Tooltip                                   | close callback from the first open still fires | Stale timer hides the new tooltip                                       | Clear the previous close timer on every open                                                                    |
