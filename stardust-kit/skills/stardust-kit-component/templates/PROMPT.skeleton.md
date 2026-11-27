<!-- PROMPT.en.md ; PROMPT.zh.md has the same structure, translated -->

# Install “<Component title>” in your workbench

Status: **<In Stardust | Design draft>**. <One sentence: where it lives in the app, or that it is a draft.>
<If shipped:> App source: `apps/web/src/components/<area>/<File>`.

Send the prompt below to Claude Code / Codex / T3 Code as is:

```text
Using `<file1>`, `<file2>` and `demo.html` in `stardust-kit/<name>/`, add the “<title>” to my workbench’s <mount point>:
1. <Structure and size: exact dimensions, what appears where, what is hidden in which case>;
2. <Behaviour: states, interactions, keyboard (roles, arrow keys), what happens on hover/press/focus>;
3. <Data: where values come from; use sample/fallback data when the project has none>;
4. <Motion: use the project’s motion tokens; honour prefers-reduced-motion; stop loops when hidden>;
5. <Theme: provide CSS variables for light and dark; list any variable the project must define>;
6. If the project lacks <dependency/constant>, substitute <fallback>, then run lint, typecheck and the existing <area> tests.
```
