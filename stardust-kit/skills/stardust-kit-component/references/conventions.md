# Conventions (taken from the shipped kit)

## Metadata per component (keep in one place, e.g. a small JSON/Python table, and generate README rows, PROMPT headers and the website index from it so they never drift)

| Field           | Example                                                       | Notes                                                                                   |
| --------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| id / dir        | `model-chip`                                                  | kebab-case folder; stable (the website links to it)                                     |
| cat             | `slider` · `usage` · `buttons` · `icon`                       | the four website tabs: Sliders / Usage & limits / Buttons & switches / Icons            |
| status          | `shipped` · `draft` · `soon`                                  | renders as 已在星尘里 / 设计稿 / 即将推出 and In Stardust / Design draft / Coming soon  |
| name            | zh "模型胶囊", en "Model chip"                                | 2-4 CJK characters / 2-3 English words                                                  |
| desc            | one sentence each language                                    | what it does, concrete (dimensions, behaviour)                                          |
| tags (keywords) | zh `["用量","额度","顶栏"]`, en `["usage","quota","top bar"]` | 3-5, nouns, shown as small chips and used for search                                    |
| app             | `chat/modelChip.css`                                          | real app source paths (relative to `apps/web/src/components/`); required for `shipped`  |
| note            | zh + en                                                       | the honest caveat ("shown only when quota is reported", "interaction shown is a draft") |
| prompt          | zh + en                                                       | same content as PROMPT.*.md                                                             |
| embed height    | e.g. 400-560 px                                               | initial iframe height before the demo reports its own                                   |

## Naming

- Folder: kebab-case noun phrase (`quota-capsule`, `weekly-reset-timeline`). Variants of one idea may share a prefix
  (`slider-r2`, `slider-r3`). Do not rename folders after publishing.
- Source files keep their app names and extensions (`QuotaTopbar.tsx`, `quotaTopbar.module.css`). A non-compilable excerpt
  is stored as `<File>.chip-excerpt.tsx.txt` and the PROMPT says which lines matter.

## demo.html contract

- Standalone: no build step, no network; fonts are system fonts; opens by double click.
- `?lang=zh|en` (default browser language); `?embed=1` → transparent background, no language switch, minimal padding.
- The measured/screenshotted element is `id="workshop-original"`.
- Reports `{stardustEmbedHeight}` to the parent only when embedded.
- Dark kit backdrop `radial-gradient(90% 70% at 50% 0%, #1c1840, #07061a 80%)`; themed components show both light and dark panels.
- Sample data only; reduced motion respected.

## Website integration (product page)

- One large demo at a time inside `<iframe sandbox="allow-scripts">`; replace the iframe on each selection (do not reuse it);
  accept height messages only from the current frame; scroll into view only when the user chose it.
- Copy-prompt button copies the PROMPT text; "Source" links to `stardust-kit/<dir>/` in the repository.
- Status badge visible on the panel; "design draft" and "coming soon" items live in the collapsible index.
- Autoplay between components pauses on hover/focus, stops after any click, and never runs under reduced motion.
- The website host is part of the audit surface: see `stardust-motion-audit` and `ui-screenshot-matrix`.

## README structure

Bilingual: zh section first, then `<a id="english">` en section. Phase tables list folder, one-line description, status,
files. A status legend sits under each table: "In Stardust ships in the app; source comes from the Stardust app. Design
draft is a demo plus prompt only." Every `demo.html` note: "add `?lang=en` for English; demos use sample data only."
