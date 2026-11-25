import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { buildConnectCliClerkAuthorizeUrl, connectCliSignInRedirectUrl } from "./connectCliAuth";

const TEST_PUBLISHABLE_KEY = `pk_test_${btoa("witty-mole-42.clerk.accounts.dev$")}`;

describe("connectCliAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores injected Clerk configuration for legacy Connect requests", () => {
    vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", TEST_PUBLISHABLE_KEY);
    vi.stubEnv("VITE_CLERK_CLI_OAUTH_CLIENT_ID", "oauthapp_123");

    const request = { state: "state-1", challenge: "challenge-1", loopbackPort: 34338 };
    const currentUrl = "http://localhost:3000/connect";
    expect(buildConnectCliClerkAuthorizeUrl(request)).toBeNull();
    expect(connectCliSignInRedirectUrl(request, currentUrl)).toBe(currentUrl);
  });
});
