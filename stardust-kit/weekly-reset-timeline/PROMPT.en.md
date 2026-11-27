# Install “Weekly reset timeline” in your workbench

Status: **Design draft**. The timeline itself ships (UsageResetTimeline.tsx). The “click instead of hover” interaction shown here is a design draft; the app still highlights on hover.

Send the prompt below to Claude Code / Codex / T3 Code as is:

```text
Using the interaction in `stardust-kit/weekly-reset-timeline/demo.html`, rework my “this week’s resets” timeline (prototype source: `UsageResetTimeline.tsx` in the same folder):
1. Remove every hover effect: dimming other lanes, font-weight changes, dot growth, and the header reading that swaps content;
2. Give each lane a transparent full-row hit area, rows touching, no dead zones;
3. Clicking a lane opens a details popover: title, “N% left · window · time reset”, plus a red “about N hours without quota” line when there is a gap, and a “Show card above” button;
4. Clicking the same lane again, pressing Esc, or clicking outside closes it; after Esc focus returns to the lane; lanes carry `aria-expanded`;
5. The popover only fades in over 120ms, with no transition under `prefers-reduced-motion`;
6. Update tests that relied on hover, then run lint and typecheck.
```

The original demo defaults to the existing hover behavior. Append `?mode=after` to see the click study described above.
