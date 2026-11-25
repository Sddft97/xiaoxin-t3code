# Pre-publish checklist

- [ ] Folder name kebab-case; contains `demo.html`, `PROMPT.zh.md`, `PROMPT.en.md`.
- [ ] Status badge matches reality (checked against the current app source); source path cited and present for "In Stardust".
- [ ] Real source files copied unchanged; the demo wraps the real original, nothing redrawn.
- [ ] `#workshop-original` exists; `?lang=zh`, `?lang=en`, `?embed=1` all work.
- [ ] In an iframe (`sandbox="allow-scripts"`), `stardustEmbedHeight` messages arrive and settle.
- [ ] Thumbnails captured from the original element; proportion check vs original passes with uniform scale only.
- [ ] Screenshots at desktop 1440 / narrow 900 / mobile 390, both languages, no horizontal overflow, no page errors.
- [ ] Light and dark verified when the component is themed.
- [ ] Motion uses shared tokens; reduced motion respected; loops stop when hidden.
- [ ] Prompt: every file named exists; numbered, testable requirements; fallback for missing pieces; lint/typecheck/tests step.
- [ ] zh and en prompts match in substance.
- [ ] Sample data only; no private names, emails, paths, tokens, account data.
- [ ] README rows added (zh and en) with status legend intact.
- [ ] Report lists what is real, what is draft and what was not verified.
