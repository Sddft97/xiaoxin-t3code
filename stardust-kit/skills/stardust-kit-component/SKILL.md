---
name: stardust-kit-component
description: >-
  Add a component to the Stardust 积木工坊 / Block Workshop (the `stardust-kit` repo folder and product-site workshop):
  folder layout, demo.html host, PROMPT.zh/en install prompts, keywords, honest status badges, real-original rule,
  thumbnails and proportion checks. Use when asked to "add a component/block/skin to the workshop", "contribute to
  stardust-kit", "write an install prompt for this component", "make a demo.html for the kit", "publish this slider/chip
  to the workshop", or in Chinese: "加入积木工坊", "新增积木/组件", "写安装提示词 PROMPT", "做 demo.html", "标注已在星尘里/设计稿/即将推出",
  "给组件做缩略图", "把这个组件发布到 stardust-kit".
---

# Stardust Kit: adding a component

Authored by the Stardust project, MIT License. The kit is a folder of self-contained components. Each has a browser demo,
bilingual install prompts an AI agent can follow, and (when it ships) the real source files.

## Folder format

```
stardust-kit/<name>/            kebab-case, one component (or one design family) per folder
  demo.html                     self-contained; opens by double-click; ?lang=zh|en, ?embed=1 for the website
  PROMPT.zh.md  PROMPT.en.md    install prompts (same content, two languages)
  <real source files>           only when the component ships (copied unchanged from the app)
  thumb.png                     optional, captured from the original (never redrawn)
```

Then add one row to the kit `README.md` (zh table and en table) and keep a keyword list for the website index.

## Status badges (use them honestly)

| Badge (zh / en)          | Meaning                              | Requirement                                                                                                                             |
| ------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 已在星尘里 / In Stardust | Ships in the current app             | **Cite the real source path** (e.g. `apps/web/src/components/chat/modelChip.css`) and include those files. Verify the path still exists |
| 设计稿 / Design draft    | Demo and prompt only; not in the app | Say what exists and what does not. A mock of a changed interaction on top of a shipped component stays "design draft" and says so       |
| 即将推出 / Coming soon   | Planned, nothing to install          | No demo claims; mention only in index/placeholder text                                                                                  |

Never upgrade a badge because it would look better. If the app changes, update the badge in README, PROMPTs and site.

## Hard rules

1. **Real originals only.** The demo wraps the actual component markup/CSS/JS (copied from the app source or the approved
   design file). Never redraw or approximate an imitation.
2. **Thumbnails come from the original.** Screenshot the real rendered element (`#workshop-original`), not a mock.
3. **Proportions verified with a uniform scale.** Compare any thumbnail/embedded copy to the original with
   `ui-screenshot-matrix/scripts/proportion-check.mjs`; width and height must scale by the same factor.
4. **Prompts must install, not describe.** An agent with only the prompt and the folder must be able to add the component
   to a Stardust/T3 Code workbench: file list, where to mount, the numbered behaviour list, theme variables, tests to run.
5. **Sample data only.** No real accounts, emails, paths, tokens or usage numbers.
6. **Both languages and both themes** where the component is themed; demo supports `?lang=en`.
7. **Motion uses shared tokens** and respects `prefers-reduced-motion` (see `stardust-motion-audit`). Look follows
   `stardust-visual-style` (dark kit backdrop, soft glow, no generic cards).
8. **No vendor lock-in:** plain HTML/CSS/JS in the demo; TSX only for files that really exist in the app.

## Steps

1. Pick name, category (slider · usage & quota · buttons & switches · icons), status, 2-4 word title, one-line description
   (zh + en), keywords (zh + en, 3-5 each).
2. Copy the real source files into the folder unchanged. If you must trim, say so in the PROMPT.
3. Build `demo.html` from `templates/demo.html` (host skeleton). Paste the original component into the stage; keep the
   stage `id="workshop-original"`.
4. Write `PROMPT.zh.md` and `PROMPT.en.md` from `templates/PROMPT.skeleton.md`.
5. Add the README rows from `templates/README-row.md`.
6. Verify: open `demo.html` (`?lang=zh`, `?lang=en`, `?embed=1` in an iframe: height messages arrive), run
   `capture-matrix` for the demo, run `proportion-check` thumbnail vs original, confirm every cited source path exists.
7. Report what is real, what is draft, and anything unverified.

## Files

- `references/conventions.md` – metadata fields, naming, keywords, README layout, website integration, embed protocol.
- `references/prompt-writing.md` – how to write install prompts that work; examples from shipped components.
- `references/checklist.md` – pre-publish checklist.
- `templates/README-row.md` – README table rows (zh + en).
- `templates/PROMPT.skeleton.md` – PROMPT skeleton (zh + en).
- `templates/demo.html` – demo host skeleton with `?lang`, `?embed`, theme, reduced motion and iframe height reporting.
