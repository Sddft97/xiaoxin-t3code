const namedLevels: Readonly<Record<string, number>> = {
  none: 0,
  minimal: 0,
  low: 0,
  medium: 1,
  moderate: 1,
  high: 2,
  xhigh: 3,
  extrahigh: 3,
  veryhigh: 3,
  max: 4,
  maximum: 4,
  extreme: 4,
};

export const GALAXY_EFFORT_LABELS = ["Low", "Medium", "High", "Extra high", "Extreme"] as const;

export function namedGalaxyEffortLevel(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const key = value.toLowerCase().replace(/[\s_-]+/g, "");
  return Object.hasOwn(namedLevels, key) ? namedLevels[key] : undefined;
}

export function galaxyEffortLevel(
  choices: readonly { id: string }[],
  selectedIndex: number,
): number {
  const index = Math.min(Math.max(0, selectedIndex), Math.max(0, choices.length - 1));
  return (
    namedGalaxyEffortLevel(choices[index]?.id) ??
    Math.round((index * 4) / Math.max(1, choices.length - 1))
  );
}

// Automatic or off options and custom catalogs can have more choices or overlapping tiers.
export function galaxyEffortStops(choices: readonly { id: string }[]): number[] {
  const mapped = choices.map((_, index) => galaxyEffortLevel(choices, index));
  return mapped.every((level, index) => index === 0 || level > mapped[index - 1]!)
    ? mapped
    : choices.map((_, index) => Math.round((index * 4) / Math.max(1, choices.length - 1)));
}
