# Method in depth

## Why state change, not component list

A component list tells you what exists; it hides the gaps. Most motion bugs live *between* components (a row leaving,
a count arriving, a result landing late). Walk the **states** of the product and ask the same question each time:

> Does the user understand this change? Did it jump, or come and go with a clear cause?

## How to walk the product

1. List the screens/routes. For each, list triggers: load, scroll, hover, focus, press, drag, keyboard, timers,
   async results, theme/language switches, viewport changes.
2. For each trigger, record what changes: visibility, position, size, text, icon, number, colour, layout of neighbours.
3. Classify the change (appear · disappear · move · resize · content swap · icon swap · number change · press/hover ·
   load/complete/error). Anything that falls outside means the list is missing a category: add it.
4. Look at it in slow motion (0.25×). Write down what you *see*, not what the CSS says.
5. Decide the intent: where did it come from, where is it going, what is it related to? Pick the token that expresses it.

## Smells (quick finds)

- Opacity and transform use different durations or curves → feels like two animations. Merge to one timing.
- `transition: all` → animates unintended properties (layout, colour) and costs frames. List properties.
- Hard-coded `0.3s ease` per component → breaks the one-language rule. Replace with a token.
- Enter and exit equal or exit slower → leaving feels sluggish.
- Dragged/resized element carries a transition → lags the pointer.
- Count-up numbers, fake progress → the number is briefly wrong.
- A state with no animation next to states with animation → inconsistent; the jump draws the eye.
- Icon swaps that pop while their container animates.
- Height animated via `height:auto` tricks on long lists → jank; use the documented exceptions or transform.
- Autoplay/ambient motion that continues during typing, drag, or while hidden.
- Animations that start before fonts/images load → flash, then CLS.

## Edge cases that always need a test

- **Interrupt/reverse:** trigger, then undo at 30–50% progress. It must continue from the current value, with no snap.
- **Rapid repeat:** click 10× fast. No queue build-up, no stale callbacks (clear timers/listeners on re-trigger).
- **Stale async:** a result arriving after the user moved on must not write to a detached/changed element
  (copy buttons, iframe messages, fetch results).
- **Long content:** a list with hundreds of rows keeps frame rate; exits stay bounded.
- **Reduced motion:** the state change still reads (icon changes, panel appears) without travel/scale/parallax; autoplay stops.
- **Keyboard:** focus ring appears instantly; Escape and Enter paths animate the same as the mouse paths (except where a
  framework deliberately closes instantly on Escape; document it).
- **Mobile / narrow / wide / dark / light:** no overflow while animating; colours and shadows still read.
- **SSR/first paint:** no flash of the pre-animation state (set initial styles in CSS, not in JS after load).

## Exceptions policy

Layout-animating exceptions are allowed only when written down with: what, why nothing cheaper works, bound
(rows/height), and a measurement vs the baseline. The shipped app documents exactly two.

## What to report

Counts before → after (distinct durations, curves), the inventory, perf JSON before → after, exceptions, and an honest
"not verified" list. If you did not replay every state at 0.25×, say so.
