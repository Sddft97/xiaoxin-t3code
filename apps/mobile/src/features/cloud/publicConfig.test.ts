import { describe, expect, it } from "vite-plus/test";

import { hasCloudPublicConfig, hasTracingPublicConfig, resolveCloudPublicConfig } from "./publicConfig";

describe("Stardust mobile public config", () => {
  it("has no hosted relay or diagnostics", () => {
    expect(hasCloudPublicConfig()).toBe(false);
    expect(hasTracingPublicConfig()).toBe(false);
    expect(resolveCloudPublicConfig()).toEqual({
      clerk: { publishableKey: null, jwtTemplate: null },
      relay: { url: null },
      observability: { tracesUrl: null, tracesDataset: null, tracesToken: null },
    });
  });
});
