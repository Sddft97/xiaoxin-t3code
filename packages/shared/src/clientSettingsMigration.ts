/** Read-only shape migration shared by desktop and browser settings loaders. */
export function migrateLegacyClientSettings(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (Object.hasOwn(record, "language")) return value;
  // Stardust's previous UI defaulted to Chinese without writing appLocale.
  // Only recognize an existing custom settings document; leave fresh/official defaults alone.
  if (!Object.hasOwn(record, "appLocale") && Object.hasOwn(record, "interfaceStyle"))
    return { ...record, language: "zh" };
  if (record.appLocale !== "zh-CN" && record.appLocale !== "en") return value;
  const { appLocale, ...settings } = record;
  return { ...settings, language: appLocale === "zh-CN" ? "zh" : "en" };
}

const MATH_DEFAULT_MIGRATION_VERSION = 1;
const MATH_DEFAULT_MIGRATION_KEY = "stardustMathDefaultMigrationVersion";

export function stampMathDefaultMigration(settings: object) {
  return { ...settings, [MATH_DEFAULT_MIGRATION_KEY]: MATH_DEFAULT_MIGRATION_VERSION };
}

export function migrateMathRenderingDefault(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const settings = value as Record<string, unknown>;
  const version = settings[MATH_DEFAULT_MIGRATION_KEY];
  if (settings.mathRenderingEnabled !== false) return null;
  if (typeof version === "number" && version >= MATH_DEFAULT_MIGRATION_VERSION) return null;
  return stampMathDefaultMigration({ ...settings, mathRenderingEnabled: true });
}
