# Writing install prompts that actually install

Audience: an AI coding agent (Claude Code, Codex, Gemini/Antigravity, T3 Code) that can read the repo folder but knows
nothing else. Success = the component works in the user's workbench after one run.

## Shape

1. Heading: `Install “<title>” in your workbench` / `把「<标题>」装进你的工作台`.
2. `Status:` line with the honest badge and where it lives in the app.
3. "Send the prompt below to Claude Code / Codex / T3 Code as is:" then one fenced `text` block.
4. Inside the block:
   - First sentence names the folder and files: "Using `A.tsx`, `b.css` and `demo.html` in `stardust-kit/<name>/`, add ... to my workbench's <mount point>:".
   - **3-6 numbered, testable requirements**: exact sizes (28px chip, 5x2px segments), counts (five levels), what is hidden
     when (single account: no badge), roles/keys (`role="radiogroup"`, arrows, Home/End), motion rules (reduced motion,
     stop loops when hidden or idle 2 s), theme (CSS variables for light and dark).
   - Fallback for missing project pieces ("if there is no `STARDUST_STAR_PATH`, substitute your own star path").
   - Last item: run lint, typecheck and the existing tests for that area.

## Do

- Reference only files that exist in the folder. Check each name.
- Prefer numbers to adjectives. "28px tall" beats "compact".
- State mount point in Stardust/T3 Code terms (composer model picker, top bar, reasoning-effort picker, sidebar).
- Say what NOT to change (keep the popover height; keep single-account chips unbadged).
- Keep zh and en identical in substance; translate, do not rewrite.

## Don't

- Don't paste long source into the prompt; point to the folder.
- Don't promise behaviour the demo lacks. Don't hide that a feature is a draft.
- Don't include private paths, account names or real data.
- Don't call a design draft "installed in the app".

## Good example (shipped component)

> Using `modelChip.css`, `ProviderModelPicker.chip-excerpt.tsx.txt` and `demo.html` in `stardust-kit/model-chip/`, turn the
> composer's model-picker button into a compact "model chip": 1. 28px tall; a 22px rounded logo tile on the left, and for
> multiple accounts a 12.5px account-number badge on the tile's bottom-right corner (hidden for a single account); 2. a
> zero-width 5-segment effort rail under the model name ...; 3. drop the dropdown arrow; darken on hover/open; 4. ellipsise
> only the front part and keep the last 7 characters; 5. light/dark colour variables, then run lint, typecheck and the
> ProviderModelPicker tests.
