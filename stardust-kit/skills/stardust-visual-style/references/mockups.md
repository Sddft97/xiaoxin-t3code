# Mockups: render inside the real Stardust shell

A mockup of a Stardust screen is only useful if it looks like Stardust will look. Therefore:

1. **Use the real shell.** Build the mockup in the real settings/workbench shell: the real sidebar, header, settings layout,
   spacing, font stack, radii and theme tokens (`stardust.css`, `--motion-*`, `--stardust-*`). Run the app (or its
   storybook/dev page) and inject the mock content; or screenshot the real app and overlay changes.
2. **Never use a generic look.** No stock Material/Windows/iOS chrome, no "Dribbble" cards, no invented sidebar. If the
   mock looks like another platform, it will be rejected.
3. **Real data shapes, sample values.** Provider names, model names, usage numbers may be sample data; no real accounts,
   emails, paths or tokens.
4. **Both themes.** Show light (Apple-neutral) and dark (slight purple night). Do not design only one.
5. **Pixel parity.** Implement the approved mockup one to one; verify with side-by-side screenshots (use the
   `ui-screenshot-matrix` proportion check, uniform scale only). List every element you touched.
6. **Honest status.** Label drafts as drafts. Do not present a mock as shipped.
7. **Annotations** (red numbered dots, callouts) are review aids, kept outside the design and removed from final art.

## How

- Settings screens: put new rows inside the existing settings shell component; use its section titles and row heights.
- Components (chips, sliders, capsules): host the demo in the kit demo shell (`stardust-kit-component` skill) with the same
  tokens; the original component CSS is copied, not retyped.
- When the real shell cannot be run, take a real screenshot of the area and clearly mark overlays.
