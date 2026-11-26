import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import "~/index.css";
import type { DesktopCliCommandState } from "@t3tools/contracts";
import { render, stubGlobal } from "../../../test/render";
import { testUiLocale } from "../../../test/uiLocale";
import { COMMUNITY_BASE_TAG } from "../../state/communityUpdates.logic";
import { useStardustStats } from "../../state/stardustStats";
import { AnchoredToastProvider } from "../ui/toast";
import { SettingsScopeProvider } from "./SettingsScopeContext";
import { AboutSettingsPanel } from "./SettingsPanels";
import { AboutVersionTitle } from "./AboutVersionTitle";

vi.mock("../../env", () => ({ isElectron: true }));

it("copies the version without a notification", async () => {
  await using screen = await render(
    <AnchoredToastProvider>
      <AboutVersionTitle version={COMMUNITY_BASE_TAG} />
    </AnchoredToastProvider>,
  );
  using write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

  await screen.getByRole("button", { name: `Copy version ${COMMUNITY_BASE_TAG}` }).click();

  expect(write).toHaveBeenCalledWith(COMMUNITY_BASE_TAG);
  await expect.element(page.getByText(/^Copied!?$/)).not.toBeInTheDocument();
});

it("exposes Stardust-only update and privacy controls in Chinese About settings", async () => {
  using _locale = testUiLocale("zh-CN");
  const cliState: DesktopCliCommandState = {
    supported: true,
    installedPath: null,
    onPath: false,
    launcherPath: "/home/test/.t3/bin/t3",
  };
  using _bridge = stubGlobal("desktopBridge", {
    getUpdateState: async () => null,
    onUpdateState: () => () => {},
    cliCommand: { getState: async () => cliState },
    getClientSettings: async () => ({}),
    getLocalEnvironmentEnabled: () => true,
    getLocalEnvironmentBootstraps: () => [],
  });
  await page.viewport(1280, 1024);
  const frame = document.createElement("main");
  frame.dataset.testid = "stardust-about";
  frame.className = "min-h-screen bg-background text-foreground";
  await using screen = await render(
    <SettingsScopeProvider search={{}} onChange={() => {}} deviceOnly>
      <AboutSettingsPanel />
    </SettingsScopeProvider>,
    { router: "/settings/about", container: frame },
  );
  await expect.element(screen.getByRole("heading", { name: "星尘", exact: true })).toBeVisible();
  const versionRow = screen.container.querySelector("#app-version");
  expect(versionRow).not.toBeNull();
  const version = page.elementLocator(versionRow!);
  await expect
    .element(version.getByText(`星尘 ${COMMUNITY_BASE_TAG}`, { exact: true }))
    .toBeVisible();
  await expect.element(version.getByRole("button", { name: "检查更新" })).toBeEnabled();
  expect(screen.container.querySelector("#update-track")).toBeNull();
  await expect
    .element(screen.getByText("随机安装 ID、版本、系统类型和 CPU 架构", { exact: false }).first())
    .toBeVisible();
  const toggle = screen.getByRole("switch", { name: "计入星尘活跃用户" });
  await expect.element(toggle).toBeChecked();
  try {
    await toggle.click();
    await expect.element(toggle).not.toBeChecked();
    expect(useStardustStats.getState().enabled).toBe(false);
  } finally {
    useStardustStats.getState().setEnabled(true);
  }
  await expect.element(screen.getByText("命令行工具", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("在任意终端用 `t3` 命令运行星尘。")).toBeVisible();
  if (import.meta.env.VITE_STARDUST_FIX_SHOTS) {
    await page.screenshot({
      path: `${import.meta.env.VITE_STARDUST_FIX_SHOTS}/09-about-fixed.png`,
      element: page.getByTestId("stardust-about"),
    });
  }
});
