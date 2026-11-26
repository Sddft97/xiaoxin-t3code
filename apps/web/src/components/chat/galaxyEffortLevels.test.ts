import { describe, expect, it } from "vite-plus/test";
import { galaxyEffortStops, namedGalaxyEffortLevel } from "./galaxyEffortLevels";

const choices = (...ids: string[]) => ids.map((id) => ({ id }));

describe("Stardust reasoning effort levels", () => {
  it("maps the five Claude levels to their approved visual steps", () => {
    expect(galaxyEffortStops(choices("low", "medium", "high", "xhigh", "max"))).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  it("keeps the provider's supported subset at the corresponding stops", () => {
    expect(galaxyEffortStops(choices("low", "high", "extra_high"))).toEqual([0, 2, 3]);
    expect(namedGalaxyEffortLevel("VERY HIGH")).toBe(3);
    expect(namedGalaxyEffortLevel("Ultra")).toBeUndefined();
  });

  it("gives custom ordered values selectable stops without inventing provider options", () => {
    expect(galaxyEffortStops(choices("auto", "small", "large"))).toEqual([0, 2, 4]);
    expect(galaxyEffortStops(choices("default", "low", "medium", "high", "max"))).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });
});
