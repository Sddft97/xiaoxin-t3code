import {
  DESKTOP_THEMES,
  ENABLE_STARDUST_THEME_MIGRATION,
  LEGACY_DESKTOP_THEMES,
  HIDDEN_DESKTOP_THEMES,
  LEGACY_THEME_ID_ALIASES,
  RESERVED_THEME_IDS,
  STARDUST_THEME_ID,
  STARDUST_THEME_MIGRATION,
  T3_CHAT_THEME,
  getThemeColorsForAppearance,
  type ThemeColors,
} from "@t3tools/shared/themePalettes";

function splash(colors: ThemeColors) {
  return {
    background: colors.canvas,
    foreground: colors.text,
    accent: colors.accent,
    chrome: colors.chrome,
  };
}

export function injectThemeBootData(
  html: string,
  migrate = ENABLE_STARDUST_THEME_MIGRATION,
): string {
  const themes = [
    ...DESKTOP_THEMES,
    ...HIDDEN_DESKTOP_THEMES,
    ...(migrate ? [] : LEGACY_DESKTOP_THEMES),
  ];
  const palettes = Object.fromEntries(
    themes.map((theme) => [
      theme.id,
      Object.fromEntries(
        (["light", "dark"] as const).flatMap((mode) => {
          const colors = getThemeColorsForAppearance(theme, mode);
          return colors ? [[mode, splash(colors)]] : [];
        }),
      ),
    ]),
  );
  return html.replace(
    "/* theme-boot-data */ null",
    JSON.stringify({
      palettes,
      reservedIds: [...RESERVED_THEME_IDS],
      aliases: migrate
        ? { ...LEGACY_THEME_ID_ALIASES, ...STARDUST_THEME_MIGRATION }
        : LEGACY_THEME_ID_ALIASES,
      defaultThemeId: migrate ? STARDUST_THEME_ID : null,
      customDefaults: {
        light: splash(T3_CHAT_THEME.colors),
        dark: splash(T3_CHAT_THEME.variants!.dark!),
      },
    }),
  );
}
