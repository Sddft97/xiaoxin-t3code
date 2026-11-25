# Product website rules

- **Dark-only.** Purple-night backdrop (`#1c1840` to `#07061a`) with a subtle star field. The page does not follow the
  system light theme. Sections that embed demos keep their night backdrop in light mode too.
- **One idea per section.** One heading, one line of supporting copy, one visual. No card grids of 6 features, no stacked
  badges. Prefer a single large demo over many small ones. Collapse long lists behind a compact index.
- **Restrained.** Few colours, generous space, quiet motion. Layout and motion rhythm may follow well-made product
  pages (e.g. a calm single-column scroll with soft reveals), but content and brand stay Stardust.
- **Demos mirror the real app.** An in-page demo must look and behave like the current shipped app. Collapse long lists;
  check image aspect ratios; use only sample data.
- **Honest status badges** on components: In Stardust / Design draft / Coming soon (see `stardust-kit-component`).
- **Bilingual:** a zh page and an en page; same structure; language switch is plain navigation.
- **Motion:** tokenised (`reveal` 480 ms, `travel` 360 ms, `sky` 720 ms plus the core table), no autoplay under reduced
  motion, no motion during typing; scroll-bound progress stays bound to scroll.
- **Performance:** target a fast first paint on mobile; lazy iframes for demos; no layout shift from late images.
- **Privacy:** no third-party trackers; downloads and a daily active ping only (if documented); no personal data in demos.
