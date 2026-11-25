import { describe, expect, it } from "vite-plus/test";
import {
  DESKTOP_THEMES,
  STARDUST_THEME,
  normalizeBuiltInThemeId,
} from "@t3tools/shared/themePalettes";
import { canonicalThemePreference, getThemeDefinition } from "./themePalette";

describe("Stardust desktop appearance migration", () => {
  it("maps retired palettes and their prefixed ids", () => {
    expect(canonicalThemePreference("apple")).toBe("stardust");
    expect(canonicalThemePreference("t3-ocean")).toBe("harbor");
    expect(canonicalThemePreference("t3-ember")).toBe("stardust");
    expect(normalizeBuiltInThemeId("apple", false)).toBe("apple");
  });

  it("defaults to Stardust and preserves the kept and historical selections", () => {
    expect(getThemeDefinition("system")).toBe(STARDUST_THEME);
    expect(getThemeDefinition("iris")?.id).toBe("iris");
    expect(getThemeDefinition("t3-chat")?.id).toBe("t3-chat");
    expect(DESKTOP_THEMES.map((theme) => theme.id)).toEqual([
      "stardust",
      "ink",
      "graphite",
      "mist",
      "harbor",
      "grove",
    ]);
  });
});
