# Lessons from auditing Stardust (site + desktop app)

## Product site audit (about 19 state changes inventoried)

- **Opacity and transform finishing at different times** was the most common defect (load, reveal, tab content, fallback
  reveal). Fix: one timing for both; keep stagger by delay, not by different durations.
- **Discrete vs scroll-bound:** scroll progress (timeline lines, mascot path) stays bound to scroll position; discrete
  reactions (nav tightens, section highlights) take shared easing. Do not mix the two.
- **Stale callbacks:** tooltip close timers, async clipboard results, iframe height messages from a previous selection.
  Clear on re-trigger; accept messages only from the current frame.
- **False numbers:** count-ups (0 → 14) show wrong values for 900 ms. Show the true value.
- **Drag:** the dragged ghost inherited the transition and lagged; slot hints used default ease; the settle overshoot was
  too big. Ghost follows directly; hints use `hover`; settle uses a two-frame `pop`.
- **Linear is legitimate** when time is the meaning (carousel progress equals remaining time) and for loops. Do not "fix" it.
- **Theme switch:** icon morph timing and press timing disagreed. The page colours commit instantly; the icon animates.
- **Native `<details>`** still changes height instantly. Arrow was aligned; content transition left as a TODO. State such
  leftovers in the report instead of hiding them.
- **Numbers:** distinct fixed durations 44 → 29 and curves 5 → 5 over the stylesheets in scope (loops, delays and fallbacks
  included); 3 shared interactive curves plus linear and one loop easing. Say what the count does and does not include
  (originals, native browser animations, JS timers and pointer-follow were excluded).
- **Limits of that audit:** not every state was replayed at 0.25×; narrow-window and dark×light combinations were not all
  verified; an iframe load gap remained visible in frame strips. Reports must list such gaps.

## Desktop app audit (motion language shipped as `--motion-*`)

- Seven tokens covered the whole workbench. Two layout-animating exceptions, both bounded and measured.
- Menu fade-out: tests stretch the ending transition to 10 s to prove the item stays during fade. Keyboard Escape in the
  UI library closes instantly by design; document such exceptions.
- Exit-row ordering convention: latest batch first, original index ascending within a batch; callers must not reorder.
- Perf comparison against baseline: alternate measurement rounds (4), compare frames >20 ms and max frame time; hover sweep 0.
- Known not done at the time: pending states for async quick actions, connection/storage banner enter/exit, progress bar
  via `scaleX`, undo/suggestion cards, and some copy bugs. Put such leftovers in a visible "not done" list.
- Do not edit upstream files only to restyle them if that creates merge conflicts; wrap or override locally.

## Process lessons

- Replay the same script before and after. Test fast reversals, slow iframes, keyboard focus, mobile throttle, threshold
  frames and layout shift.
- Keep project-specific coordinates and rhythms (e.g. a mascot's resting position) in project code; keep the method and
  tokens generic.
- CSS is the source of truth for values; JS reads them from CSS tokens (`getComputedStyle`) or a mirrored constants file.
