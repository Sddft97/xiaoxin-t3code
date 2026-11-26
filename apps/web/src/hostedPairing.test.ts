import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  buildHostedPairingUrl,
  hasHostedPairingRequest,
  isHostedStaticApp,
  readHostedPairingRequest,
} from "./hostedPairing";

describe("hostedPairing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enables hosted approval on the Connect app and keeps local servers local", () => {
    const hosted = new URL("https://app.t3.codes/approve-agent");
    expect(isHostedStaticApp(hosted)).toBe(true);
    expect(isHostedStaticApp(new URL("http://127.0.0.1:3773/approve-agent"))).toBe(false);
    vi.stubEnv("VITE_HTTP_URL", "http://127.0.0.1:3773");
    expect(isHostedStaticApp(hosted)).toBe(false);
  });

  it("reads hosted pairing host and query token parameters", () => {
    const url = new URL("https://app.t3.codes/pair?host=100.64.1.2:3773&token=ABCD1234");

    expect(readHostedPairingRequest(url)).toEqual({
      host: "100.64.1.2:3773",
      token: "ABCD1234",
      label: "",
    });
    expect(hasHostedPairingRequest(url)).toBe(true);
  });

  it("prefers hash tokens so direct pairing links do not put credentials in search params", () => {
    vi.stubEnv("VITE_HOSTED_APP_URL", "https://preview.t3.codes");

    const url = new URL(
      buildHostedPairingUrl({
        host: "https://backend.example.com:3773",
        token: "pairing-token",
        label: "Workstation",
      }),
    );

    expect(url.origin).toBe("https://backend.example.com:3773");
    expect(url.pathname).toBe("/pair");
    expect(url.searchParams.has("host")).toBe(false);
    expect(url.searchParams.get("label")).toBe("Workstation");
    expect(url.searchParams.has("token")).toBe(false);
    expect(url.hash).toBe("#token=pairing-token");
  });
});
