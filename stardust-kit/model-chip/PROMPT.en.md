# Install “Model chip” in your workbench

Status: **In Stardust**. The model-picker button in the composer.

Send the prompt below to Claude Code / Codex / T3 Code as is:

```text
Using `modelChip.css`, `ProviderModelPicker.chip-excerpt.tsx.txt` and `demo.html` in `stardust-kit/model-chip/`, turn the composer’s model-picker button into a compact “model chip”:
1. 28px tall; a 22px rounded logo tile on the left, and for multiple accounts a 12.5px account-number badge on the tile’s bottom-right corner (hidden for a single account);
2. A zero-width 5-segment effort rail under the model name (each segment 5×2px, 1.5px gap), reached levels in the accent colour, adding no horizontal width;
3. Drop the dropdown arrow; darken the background on hover or when the popup is open;
4. For long names, ellipsise only the front part and keep the last 7 characters;
5. Provide colour variables for light and dark themes, then run lint, typecheck and the ProviderModelPicker tests.
```
