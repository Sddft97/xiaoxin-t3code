# Before / after layout

`compare-sheet.mjs` pairs files by name from `--before` and `--after` and renders one PNG per pair:

- Title row: the file name (it encodes lang/theme/viewport/state).
- `--layout side` (default): before left, after right, both at the SAME width (`--width`, default 720), so any vertical
  difference is real. `--layout stack` for wide desktop shots.
- Labels: `--label-before before --label-after after` (use real names such as `v1.2.3` / `fix-nav`).
- Files that exist on only one side are listed in the console; resolve them, they usually mean a state was missed.

## Presenting evidence

1. A one-line verdict per change: what changed, what must not have changed.
2. Embed 2-4 representative sheets (worst case first: mobile + longest language), not all 36.
3. Quote the manifest result (`no horizontal overflow, no page errors` or the offending lines).
4. List unverified cells explicitly ("light theme on narrow not captured").
5. Keep before/after generated with identical scripts and flags; mention commit or build for each side.
