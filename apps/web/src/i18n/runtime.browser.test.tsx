import { expect, it } from "vite-plus/test";

import { getI18nSnapshot, startI18n, whenLocaleReady } from "./runtime";

function stubDesktopBridge(languages: readonly string[]): Disposable {
  const host = window as { desktopBridge?: unknown };
  host.desktopBridge = { getPreferredSystemLanguages: () => languages };
  return { [Symbol.dispose]: () => delete host.desktopBridge };
}

it("follows the OS language on desktop, where navigator.languages is pinned to en-US", async () => {
  using _bridge = stubDesktopBridge(["zh-Hans-CN", "en-US"]);
  startI18n();
  await whenLocaleReady();
  expect(getI18nSnapshot().locale).toBe("zh");
});
