import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { hasCloudPublicConfig, resolveCloudPublicConfig, resolveRelayTracingConfig } from "./publicConfig";

describe("Stardust web public config", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ignores hosted credentials, relay and trace settings injected by an upstream build", () => {
    vi.stubEnv("VITE_T3CODE_RELAY_URL", "https://relay.example.test");
    vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_live_example");
    vi.stubEnv("VITE_CLERK_JWT_TEMPLATE", "example");
    vi.stubEnv("VITE_RELAY_OTLP_TRACES_URL", "https://collector.example.test/v1/traces");
    vi.stubEnv("VITE_RELAY_OTLP_TRACES_DATASET", "example");
    vi.stubEnv("VITE_RELAY_OTLP_TRACES_TOKEN", "fake");
    expect(hasCloudPublicConfig()).toBe(false);
    expect(resolveCloudPublicConfig().relayUrl).toBeNull();
    expect(resolveRelayTracingConfig()).toBeNull();
  });
});
