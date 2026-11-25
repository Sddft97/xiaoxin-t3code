# Token table and curves

Reference language from the shipped Stardust app (`apps/web/src/index.css` `--motion-*`, mirrored in `lib/workbenchMotion.ts`).
Copy `tokens.css` / `tokens.ts` from this folder. Authored by the Stardust project, MIT License.

| Token | Duration | Curve | Use for |
|---|---|---|---|
| press | 80 ms | standard | Press (pressed rows, buttons) |
| hover | 120 ms | standard | Hover show/hide, colour/tint, menu open/close |
| swap | 160 ms | standard | A mark changes meaning (status glyph A → B) |
| exit | 180 ms | exit | Leave / collapse. Faster than enter |
| enter | 220 ms | standard | Appear; FLIP when neighbouring rows make room |
| expand | 240 ms | standard | Expand, chevron rotation, progress advance |
| pop | 240 ms | pop | Two-frame scale-in only (a three-frame bounce uses standard) |

Curves:

- `standard = cubic-bezier(0.32, 0.72, 0, 1)`: quick start, long soft landing. Default for everything that arrives or changes.
- `exit = cubic-bezier(0.4, 0, 0.85, 0.6)`: accelerates away; leaving should never linger.
- `pop = cubic-bezier(0.22, 1.16, 0.36, 1)`: slight overshoot. Rare; two-frame scale-ins only.
- `linear` is allowed only where time itself is the meaning (a progress bar tied to a real timer, scroll-bound progress) and for infinite ambient loops.

## Rules of use

- Animate `transform` and `opacity`. Colour/`background-color` is fine for hover.
- Two documented layout exceptions in the shipped app (per-frame layout, bounded and measured against a baseline):
  1. disclosure folding with `grid-template-rows` (0fr ↔ 1fr);
  2. a `height` collapse on a trailing row when nothing below it can glide instead.
  Any further layout animation needs a written reason and a perf number.
- Enter is slower than exit (220 vs 180). Repeated actions get faster, not slower: after the user triggers something
  several times in a row, shorten or skip.
- Use semantic names (what the change IS), never numbers, in code: `var(--motion-swap)`, not `160ms`.
- Reduced motion: collapse durations to ~0 but keep the state change (an icon still changes, a panel still appears).

## Extra named tokens (scroll-driven, ambient, mascot)

Add one only when no row above fits. Name it by meaning, define it once in CSS, mirror it in TS if scripts need it.
These come from the Stardust product-site audit (all use the `standard` curve unless noted):

| Token | Duration | Use for | Why it is separate |
|---|---|---|---|
| reveal | 480 ms | Section/hero content entering as the page loads or scrolls into view | Page-scale arrival; opacity and offset finish together |
| travel | 360 ms | An element moving between two places (mascot path legs, tab indicator across a row) | Distance-scaled; needs a longer, readable path |
| sky | 720 ms | Backdrop/atmosphere changes (starfield to footer wordmark, large colour fields) | Slow on purpose; must not compete with content |

Guidance for new tokens:

- **Scroll-driven:** progress that mirrors scroll position is bound to scroll (linear, no duration). Only *discrete*
  reactions to scroll (nav tightens, a section lights up) use tokens. Use `animation-timeline: scroll()/view()` where
  available and a throttled IntersectionObserver fallback with the same timing.
- **Ambient loops** (twinkling, orbiting, breathing): give them a cycle token (e.g. `ambient-slow: 4s`, `linear` or
  `ease-in-out`), pause when off-screen or hidden, stop completely under reduced motion, and cap the frame budget
  (the Stardust canvas runs ~8–10 fps by design).
- **Mascot / character motion** (blink, look, path): a character may have its own rhythm, but express it as a few named
  durations (blink 120 ms, glance 360 ms = travel, idle 4 s cycle), reuse the shared curves, and keep expressions to the
  eyes only. Never let it move during typing, drag or any primary task.
- **Count and justify:** after adding tokens, re-run `scripts/count-motion.mjs`. Distinct durations should be ≈ the number
  of tokens plus documented loops, not more.
