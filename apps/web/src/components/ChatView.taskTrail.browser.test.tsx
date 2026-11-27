import { createMemoryHistory } from "@tanstack/react-router";
import { NodeId, ProviderDriverKind, TurnItemId } from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import "~/index.css";

import { AppRoot } from "~/AppRoot";
import "~/components/ChatView";
import { __setClientSettingsForTests } from "~/hooks/useSettings";
import { refreshTheme } from "~/hooks/useTheme";
import { startI18n, whenLocaleReady } from "~/i18n/runtime";
import { getRouter } from "~/router";
import { applyThemePalette } from "~/themePalette";
import {
  ENVIRONMENT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../test/fakeEnvironment";
import { render } from "../../test/render";
import { testUiLocale } from "../../test/uiLocale";

// The socket is the only fake layer.
vi.mock("../../../../packages/client-runtime/src/connection/driver.ts", async (importOriginal) => {
  const [actual, { fakeDriver }, Layer] = await Promise.all([
    importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
    import("../../test/fakeEnvironment"),
    import("effect/Layer"),
  ]);
  return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
});

it.each([
  [1280, 800],
  [1440, 900],
])("keeps delegated work clear of the capsule and composer at %i × %i", async (width, height) => {
  using _locale = testUiLocale("zh-CN");
  await page.viewport(width, height);
  const thread = threadWithHistory("release", 8);
  const last = thread.items.findLast((item) => item.type === "assistant_message")!;
  const shortTitle = "v1.2.6 最终包重建（含 Windows 修复）";
  const title =
    width === 1280
      ? shortTitle
      : shortTitle +
        "：重新构建安装包、核对数字签名和校验值，验证升级、卸载与回滚流程，再汇总所有平台的发布验收结果。";
  const child = threadWithHistory("windows-build", 1);
  using _environment = installFakeEnvironment([
    {
      ...thread,
      title: "星尘发布",
      runs: [
        ...thread.runs.slice(0, -1),
        { ...thread.runs.at(-1)!, status: "waiting", completedAt: null },
      ],
      items: [
        ...thread.items,
        ...Array.from({ length: 6 }, (_, index) => ({
          ...last,
          type: "file_search" as const,
          id: TurnItemId.make(`search-${index}`),
          ordinal: last.ordinal + index + 1,
          pattern: "*.tsx",
        })),
        {
          ...last,
          type: "subagent",
          id: TurnItemId.make("delegate"),
          subagentId: NodeId.make("windows-build"),
          origin: "app_owned",
          driver: ProviderDriverKind.make("codex"),
          providerInstanceId: thread.runs.at(-1)!.providerInstanceId,
          childThreadId: child.id,
          ordinal: last.ordinal + 7,
          status: "running",
          completedAt: null,
          startedAt: null,
          title,
          prompt: title,
          result: null,
        },
      ],
    },
    {
      ...child,
      title,
      providerSubagentOf: thread.id,
      runs: [{ ...child.runs[0]!, status: "running", completedAt: null }],
    },
  ]);
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    language: "zh",
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  startI18n();
  await whenLocaleReady();
  const router = getRouter(
    createMemoryHistory({ initialEntries: [`/${ENVIRONMENT_ID}/${thread.id}`] }),
  );
  await router.load();
  await using app = await render(<AppRoot router={router} />, { router: false });
  const waiting = page.getByText(`等待中 · ${title}`, { exact: true });
  const capsule = page.getByRole("button", { name: `委派 ${title} · 已完成 6 项调用` });
  await expect.element(waiting).toBeVisible();
  await expect.element(capsule).toBeVisible();
  using _theme = { [Symbol.dispose]: () => refreshTheme() };
  const row = waiting.element().closest("[data-thread-now-line]")!;
  const plan = capsule.element().closest("[data-plan-capsule]")!;
  const composer = app.container.querySelector("[data-chat-composer-form]")!;
  function expectClearance() {
    const rowBox = row.getBoundingClientRect();
    const planBox = plan.getBoundingClientRect();
    const composerTop = composer.getBoundingClientRect().top;
    expect(rowBox.bottom).toBeLessThanOrEqual(planBox.top);
    expect(planBox.bottom).toBeLessThan(composerTop);
    expect(rowBox.bottom).toBeLessThan(composerTop);
  }
  for (const appearance of ["light", "dark"] as const) {
    document.documentElement.classList.toggle("dark", appearance === "dark");
    applyThemePalette("stardust", appearance);
    if (width === 1280 && import.meta.env.VITE_CAPSULE_SHOTS) {
      await page.screenshot({
        path: `__screenshots__/capsule-${import.meta.env.VITE_CAPSULE_SHOTS}-${appearance}.png`,
        animations: "disabled",
      });
    }
    await vi.waitFor(expectClearance);
  }
  if (width === 1440) {
    const clipped = capsule.element().querySelector<HTMLElement>(".plan-title-in")!;
    expect(clipped.scrollWidth).toBeGreaterThan(clipped.clientWidth);
    await userEvent.hover(waiting);
    await expect
      .element(page.getByRole("tooltip"), { timeout: 2500 })
      .toHaveTextContent(`等待中 · ${title}`);
    await userEvent.hover(capsule);
    await expect
      .element(page.getByRole("tooltip"), { timeout: 2500 })
      .toHaveTextContent(clipped.textContent!);
  }
  await capsule.click();
  await expect.element(page.getByRole("region", { name: "实时执行动态" })).toBeVisible();
  await vi.waitFor(expectClearance);
});
