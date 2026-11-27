import { cdp, page, userEvent } from "vite-plus/test/browser";
import { expect, it, vi } from "vite-plus/test";
import { wcagContrast } from "culori/fn";
import type { ReactNode } from "react";

import { testUiLocale } from "../../../test/uiLocale";
import { render } from "../../../test/render";
import "~/index.css";
import { applyAppearanceContrast } from "~/appearanceContrast";
import { applyThemePalette } from "~/themePalette";
import { StorageTidyView, type StorageTidyViewProps } from "./StorageTidyView";
import { defaultSelection } from "./storageTidyModel";
import {
  TIDY_FIXTURE_NOW,
  fixtureOperation,
  fixtureResultState,
  fixtureScan,
  fixtureState,
} from "./storageTidy.fixture";

vi.mock(import("~/i18n/useUiText"), async () => {
  const { uiText } = await import("~/i18n");
  return {
    useUiText: () => (source: string, values?: Readonly<Record<string, unknown>>) =>
      uiText(source, values, "zh-CN"),
  };
});

const noop = () => undefined;
function props(over: Partial<StorageTidyViewProps> = {}): StorageTidyViewProps {
  return {
    state: fixtureState,
    mode: "start",
    activeVolumePath: "/",
    selected: new Set(),
    rescueEnabled: true,
    canWrite: true,
    busy: false,
    nowMs: TIDY_FIXTURE_NOW,
    error: null,
    settingsError: null,
    onVolumeChange: noop,
    onToggle: noop,
    onToggleMany: noop,
    onRescueChange: noop,
    onScan: noop,
    onExecute: noop,
    onUndo: noop,
    onOpenArchive: noop,
    onFinish: noop,
    onCopyMoleInstall: noop,
    onSettingsChange: noop,
    ...over,
  };
}
const MOLE_ATTRIBUTION =
  "系统缓存清单来自开源工具 Mole（tw93/Mole，GPL-3.0）的预览结果，由星尘执行并支持撤销。本功能与 Mole 项目无隶属关系。";
const FIXED_RULES = "删除由固定规则决定，不由 AI 模型决定。";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div data-testid="frame" className="flex h-dvh w-full flex-col bg-background text-foreground">
      {children}
    </div>
  );
}

// Screenshots are written only on request: VITE_TIDY_SHOTS=1 npx vitest run --project browser …
async function shot(name: string, scrollTo?: string) {
  const output = import.meta.env.VITE_STARDUST_FIX_SHOTS;
  if (!import.meta.env.VITE_TIDY_SHOTS && !output) return;
  await page.viewport(1280, 800);
  const frame = document.querySelector<HTMLElement>("[data-settings-page-scroll]")!;
  if (scrollTo) frame.querySelector(scrollTo)?.scrollIntoView({ block: "start" });
  const root = document.documentElement;
  const previousTheme = root.dataset.themeId ?? "default";
  const wasDark = root.classList.contains("dark");
  try {
    for (const theme of ["light", "dark"] as const) {
      root.classList.toggle("dark", theme === "dark");
      applyThemePalette("stardust", theme);
      const basename = `${name}-${theme}`;
      await page.screenshot({
        animations: "disabled",
        scale: "css",
        path: output ? `${output}/storage-${basename}.png` : `${basename}.png`,
      });
    }
  } finally {
    root.classList.toggle("dark", wasDark);
    applyThemePalette(previousTheme, wasDark ? "dark" : "light");
  }
}

it("start: disk overview, one scan button and the two required lines", async () => {
  using _locale = testUiLocale("zh-CN");
  const onScan = vi.fn();
  await using screen = await render(
    <Frame>
      <StorageTidyView {...props({ onScan })} />
    </Frame>,
  );
  expect(screen.container.querySelector("h1")?.textContent).toBe("存储与清理");
  expect(screen.container.textContent).toContain("已用 460 GB");
  expect(screen.container.textContent).toContain("剩余 40.0 GB");
  expect(screen.container.textContent).toContain(MOLE_ATTRIBUTION);
  expect(screen.container.textContent).toContain(FIXED_RULES);
  expect(screen.container.textContent).toContain("点击「扫描」开始");
  const buttons = [...screen.container.querySelectorAll("button")].filter((b) =>
    b.textContent?.startsWith("扫描"),
  );
  expect(buttons).toHaveLength(1);
  buttons[0]!.click();
  expect(onScan).toHaveBeenCalledOnce();
  await shot("start");
});

it("result: three tiers, only 放心清 preselected, 只提醒不动 cannot be ticked", async () => {
  using _locale = testUiLocale("zh-CN");
  const selected = defaultSelection(fixtureScan.items);
  await using screen = await render(
    <Frame>
      <StorageTidyView {...props({ mode: "result", state: fixtureResultState, selected })} />
    </Frame>,
  );
  const text = screen.container.textContent ?? "";
  for (const heading of [
    "放心清",
    "看一眼",
    "只提醒不动",
    "系统与应用缓存（Mole 规则）",
    "先抢救，再清理",
  ])
    expect(text, heading).toContain(heading);
  expect(text).toContain(MOLE_ATTRIBUTION);
  expect(text).toContain(FIXED_RULES);
  const safe = screen.container.querySelector('[data-testid="tidy-tier-safe"]')!;
  const review = screen.container.querySelector('[data-testid="tidy-tier-review"]')!;
  const remind = screen.container.querySelector('[data-testid="tidy-tier-remind"]')!;
  expect(
    safe.querySelectorAll('[role="checkbox"][aria-checked="true"]').length,
  ).toBeGreaterThanOrEqual(9);
  expect(review.querySelectorAll('[role="checkbox"][aria-checked="true"]')).toHaveLength(0);
  for (const box of remind.querySelectorAll<HTMLElement>(
    '[data-testid="tidy-item"] [role="checkbox"]',
  ))
    expect(box.getAttribute("aria-disabled")).toBe("true");
  // Uncommitted work is never in 放心清.
  expect(safe.querySelector('[data-kind="dirty-repo"]')).toBeNull();
  expect(safe.textContent).not.toContain("c72-port");
  expect(review.textContent).toContain("c72-port");
  expect(remind.textContent).toContain("有 12 个文件未提交，所以不动它");
  await shot("result");
  await shot("result-review", '[data-testid="tidy-tier-review"]');
});

it("rows expand to what / tool / last used / why / recovery / size / path", async () => {
  using _locale = testUiLocale("zh-CN");
  await using screen = await render(
    <Frame>
      <StorageTidyView
        {...props({ mode: "result", state: fixtureResultState, selected: new Set() })}
      />
    </Frame>,
  );
  const row = [...screen.container.querySelectorAll<HTMLElement>('[data-testid="tidy-item"]')].find(
    (r) => r.textContent?.includes("Codex 会话记录"),
  )!;
  expect(row.textContent).toContain("压缩归档");
  row.querySelector<HTMLButtonElement>("button[aria-expanded]")!.click();
  await vi.waitFor(() => expect(row.querySelector("dl")).not.toBeNull());
  const detail = row.querySelector("dl")!.textContent!;
  for (const label of [
    "这是什么",
    "来源工具",
    "上次使用",
    "为什么可以清",
    "怎么恢复",
    "大小",
    "路径",
  ])
    expect(detail, label).toContain(label);
  expect(detail).toContain("214 天前");
  expect(detail).toContain("/Users/me/.codex/sessions");
});

it("shows pending release for Trash items and sends the selection when clicked", async () => {
  using _locale = testUiLocale("zh-CN");
  const onExecute = vi.fn();
  const selected = new Set(["mole-user", "sess-codex"]);
  await using screen = await render(
    <Frame>
      <StorageTidyView
        {...props({ mode: "result", state: fixtureResultState, selected, onExecute })}
      />
    </Frame>,
  );
  const bar = screen.container.querySelector('[data-testid="tidy-action-bar"]')!;
  expect(bar.textContent).toContain("已选 2 项");
  expect(bar.textContent).toContain("立即释放");
  expect(bar.textContent).toContain("进废纸篓 3.40 GB，7 天后释放");
  await screen.getByRole("button", { name: "清理已选项" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect.element(dialog).toBeVisible();
  expect(onExecute).not.toHaveBeenCalled();
  expect(dialog.element().textContent).toContain("3.40 GB");
  await dialog.getByRole("button", { name: "清理已选项" }).click();
  expect(onExecute).toHaveBeenCalledOnce();
});

it("Mole missing: a calm install row that copies the brew command and links the project", async () => {
  using _locale = testUiLocale("zh-CN");
  const onCopyMoleInstall = vi.fn();
  const state = {
    ...fixtureResultState,
    scan: {
      ...fixtureScan,
      mole: { status: "missing" as const, binary: null, message: null, listed: 0, ignored: 0 },
    },
  };
  await using screen = await render(
    <Frame>
      <StorageTidyView
        {...props({ mode: "result", state, selected: new Set(), onCopyMoleInstall })}
      />
    </Frame>,
  );
  const row = screen.container.querySelector('[data-testid="mole-missing"]')!;
  expect(row.textContent).toContain("未安装 Mole");
  [...row.querySelectorAll("button")].find((b) => b.textContent?.includes("安装 Mole"))!.click();
  expect(onCopyMoleInstall).toHaveBeenCalledOnce();
  expect(row.querySelector("a")?.getAttribute("href")).toBe("https://github.com/tw93/Mole");
});

it("done: honest summary with pending Trash, undo and open archive", async () => {
  using _locale = testUiLocale("zh-CN");
  const onUndo = vi.fn();
  const onOpenArchive = vi.fn();
  const state = { ...fixtureState, operation: fixtureOperation };
  await using screen = await render(
    <Frame>
      <StorageTidyView {...props({ mode: "done", state, onUndo, onOpenArchive })} />
    </Frame>,
  );
  const text = screen.container.textContent ?? "";
  expect(
    screen.container.querySelector('[data-testid="freed-now"]')?.textContent?.replace(/\s/g, ""),
  ).toBe("55.0GB");
  for (const part of [
    "实际释放",
    "废纸篓暂存 17.0 GB",
    "清理前",
    "清理后",
    "7 天后",
    "已用 92%",
    "已用 81%",
    "撤销废纸篓里的部分",
    "已抢救 1,020 个文件",
    "c72-port：794 个文件未提交",
  ])
    expect(text, part).toContain(part);
  expect(text).toContain("/Users/me/Documents/T3 Stardust 抢救/2026-11-22");
  expect(text).toContain("部分路径已跳过：刚刚还在使用，已跳过");
  const undo = [...screen.container.querySelectorAll("button")].find(
    (b) => b.textContent === "撤销废纸篓里的部分",
  )!;
  undo.click();
  expect(onUndo).toHaveBeenCalledOnce();
  [...screen.container.querySelectorAll("button")]
    .find((b) => b.textContent === "打开归档")!
    .click();
  expect(onOpenArchive).toHaveBeenCalledOnce();
  await shot("done");
  await shot("done-detail", '[data-testid="undo-card"]');
});

it("scanning shows progress without a second scan button", async () => {
  using _locale = testUiLocale("zh-CN");
  const state = {
    ...fixtureState,
    phase: "scanning" as const,
    progress: { checked: 3, total: 8, step: "tmp" },
  };
  await using screen = await render(
    <Frame>
      <StorageTidyView {...props({ mode: "scanning", state })} />
    </Frame>,
  );
  expect(screen.container.querySelector('[data-testid="scan-step"]')?.textContent).toContain(
    "已检查 3/8 处",
  );
  await userEvent.hover(screen.container.querySelector("button")!);
  await shot("scanning");
});

it.each([900, 1280])(
  "fits the settings content beside navigation at a %ipx viewport",
  async (width) => {
    await page.viewport(width, 800);
    const panel = document.createElement("div");
    // Reserve space for the settings navigation and page gutters.
    panel.style.width = "calc(100% - 320px)";
    await using screen = await render(
      <StorageTidyView {...props({ mode: "result", state: fixtureResultState })} />,
      { container: panel },
    );
    const meter = screen.getByTestId("storage-tidy-donut").element();
    expect(meter.getAttribute("role")).toBe("img");
    expect(meter.getAttribute("aria-label")).toContain("Macintosh HD");
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
    const used = meter.querySelector('[data-segment="used"]')!.getBoundingClientRect();
    const safe = meter.querySelector('[data-segment="safe"]')!.getBoundingClientRect();
    expect(used.width / safe.width).toBeCloseTo(369 / 53.1, 1);
    expect(used.height).toBeLessThan(16);
    expect(
      screen.getByText("53.1 GB", { exact: true }).first().element().closest("dd"),
    ).not.toBeNull();
  },
);

it.each([900, 1280])(
  "keeps result rows clear of the selection bar and anchors overlays at %ipx",
  async (width) => {
    using _locale = testUiLocale("zh-CN");
    await page.viewport(width, 800);
    const panel = document.createElement("div");
    if (width === 900) panel.style.width = "calc(100% - 320px)";
    const renderResults = (selected: ReadonlySet<string>) => (
      <Frame>
        <StorageTidyView {...props({ mode: "result", state: fixtureResultState, selected })} />
      </Frame>
    );
    const selected = defaultSelection(fixtureScan.items);
    await using screen = await render(renderResults(selected), { container: panel });
    const scroll = panel.querySelector<HTMLElement>("[data-settings-page-scroll]")!;
    const bar = screen.getByTestId("tidy-action-bar");
    const rect = (element: Element) => element.getBoundingClientRect();
    const checkViewport = (element: Element) => {
      const box = rect(element);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(800);
    };
    const segment = screen
      .getByTestId("storage-tidy-donut")
      .element()
      .querySelector('[data-segment="safe"]')!;
    await userEvent.hover(segment);
    const tip = page.getByRole("tooltip");
    await expect.element(tip).toHaveTextContent("放心清 · 53.1 GB · 10.6%");
    checkViewport(tip.element());
    const anchor = rect(segment);
    const popup = rect(tip.element());
    const center = anchor.left + anchor.width / 2;
    expect(popup.left).toBeLessThan(center);
    expect(popup.right).toBeGreaterThan(center);
    expect(popup.top).toBeGreaterThanOrEqual(anchor.bottom);
    if (width === 1280) await shot("tooltip");

    scroll.scrollTop = scroll.scrollHeight / 2;
    await expect.element(tip).not.toBeInTheDocument();
    expect(rect(scroll).bottom).toBeLessThanOrEqual(rect(bar.element()).top);
    const list = screen.getByTestId("tidy-tier-safe").element().querySelector("ul")!;
    expect(rect(bar.element()).left).toBeCloseTo(rect(list).left, 0);
    expect(rect(bar.element()).right).toBeCloseTo(rect(list).right, 0);
    if (width === 1280) await shot("mid");
    scroll.scrollTop = scroll.scrollHeight;
    const last = screen.getByTestId("tidy-item").last().element();
    expect(scroll.scrollTop).toBeGreaterThan(0);
    expect(rect(last).top).toBeGreaterThanOrEqual(rect(scroll).top);
    expect(rect(last).bottom).toBeLessThanOrEqual(rect(scroll).bottom);
    expect(rect(last).bottom).toBeLessThan(rect(bar.element()).top);
    checkViewport(last);
    if (width === 1280) await shot("bottom");

    const trigger = bar.getByRole("button", { name: "直接删除并释放" });
    await trigger.click();
    const dialog = page.getByRole("alertdialog", { name: "确认清理已选的 9 项？" });
    await expect.element(dialog).toBeVisible();
    const cancel = dialog.getByRole("button", { name: "取消" });
    await expect.element(cancel).toHaveFocus();
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    await expect.element(dialog.getByRole("button", { name: "直接删除并释放" })).toHaveFocus();
    await userEvent.keyboard("{Tab}");
    await expect.element(cancel).toHaveFocus();
    checkViewport(dialog.element());
    if (width === 1280) await shot("confirm");
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    await screen.rerender(renderResults(new Set()));
    await expect.element(bar).not.toBeInTheDocument();
    await screen.rerender(renderResults(selected));
    await expect.element(bar).toBeVisible();
  },
);

it("opens the selection bar without motion when reduced motion is enabled", async () => {
  const session = cdp();
  try {
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    const result = props({ mode: "result", state: fixtureResultState });
    await using screen = await render(
      <Frame>
        <StorageTidyView {...result} />
      </Frame>,
    );
    await screen.rerender(
      <Frame>
        <StorageTidyView {...result} selected={defaultSelection(fixtureScan.items)} />
      </Frame>,
    );
    const bar = screen.getByTestId("tidy-action-bar");
    await expect.element(bar).toBeVisible();
    const panel = bar.element().closest('[data-slot="collapsible-panel"]')!;
    expect(getComputedStyle(panel).transitionProperty).toBe("none");
    expect(getComputedStyle(panel.firstElementChild!).transitionProperty).toBe("none");
  } finally {
    await session.send("Emulation.setEmulatedMedia", { features: [] });
  }
});

it("preserves occupied and free capacity in forced colors", async () => {
  const session = cdp();
  try {
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
    });
    await using screen = await render(<StorageTidyView {...props()} />);
    const meter = screen.getByTestId("storage-tidy-donut").element();
    const fill = (id: string) =>
      getComputedStyle(meter.querySelector(`[data-segment="${id}"]`)!).backgroundColor;
    expect(matchMedia("(forced-colors: active)").matches).toBe(true);
    expect(fill("free")).not.toBe(fill("used"));
  } finally {
    await session.send("Emulation.setEmulatedMedia", { features: [] });
  }
});

it.each(["light", "dark"] as const)(
  "keeps the breakdown legible in Stardust %s at normal and high contrast",
  async (appearance) => {
    const root = document.documentElement;
    const previousTheme = root.dataset.themeId ?? "default";
    const wasDark = root.classList.contains("dark");
    const previousStyle = root.style.cssText;
    try {
      root.classList.toggle("dark", appearance === "dark");
      applyThemePalette("stardust", appearance);
      await using screen = await render(
        <StorageTidyView {...props({ mode: "result", state: fixtureResultState })} />,
      );
      const card = screen.getByTestId("storage-tidy-donut").element().closest("section")!;
      for (const contrast of [100, 200]) {
        applyAppearanceContrast(root, contrast);
        const surface = getComputedStyle(card).backgroundColor;
        for (const element of card.querySelectorAll("dt, dd")) {
          expect(wcagContrast(getComputedStyle(element).color, surface)).toBeGreaterThanOrEqual(
            4.5,
          );
        }
      }
    } finally {
      root.classList.toggle("dark", wasDark);
      applyThemePalette(previousTheme, wasDark ? "dark" : "light");
      root.style.cssText = previousStyle;
    }
  },
);

it("shows measured free space without inventing a used fraction when total capacity is unknown", async () => {
  const state = {
    ...fixtureState,
    volumes: fixtureState.volumes.map((volume) => ({ ...volume, totalBytes: null })),
  };
  await using screen = await render(<StorageTidyView {...props({ state })} />);
  expect(screen.container.querySelector('[data-testid="storage-tidy-donut"]')).toBeNull();
  expect(screen.container.textContent).toContain("剩余 40.0 GB");
  expect(screen.container.textContent).not.toContain("已用 0 B");
});
