import { testUiLocale } from "../../../test/uiLocale";
import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime/environment";
import { ThreadResumeCard } from "../chat/ThreadResumeCard";
import { useResumeCardStore } from "../../resumeCardStore";
import { useUiStateStore } from "../../uiStateStore";
import { describe, expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { applyThemePalette } from "~/themePalette";
import { MessageId, NodeId, PlanId, ProviderInstanceId, RunId, ThreadId } from "@t3tools/contracts";
import "~/index.css";
import { act, fakeTimers, render } from "../../../test/render";
import { makeThreadFixture, makeThreadProjectionFixture } from "../../test-fixtures";
import * as entities from "../../state/entities";
import type { SidebarThreadSummary } from "../../types";
import { useRightPanelStore } from "../../rightPanelStore";
import type { BoardData } from "../../taskBoard.logic";
import { WorkbenchInbox } from "./WorkbenchInbox";
import { threadResumeToken } from "../../resumeCard";

const board = vi.hoisted(() => ({ data: null as BoardData | null }));

vi.mock("../../taskBoard", () => ({
  useTaskBoard: Object.assign(
    (select: (state: { error: null; data: BoardData | null }) => unknown) =>
      select({ error: null, data: board.data }),
    { setState: () => {} },
  ),
  mutateTaskBoard: async () => {},
  requestTaskBoardCard: () => {},
  focusTaskBoardItem: () => {},
}));
vi.mock("../../state/entities", async (original) => ({
  ...(await original<typeof import("../../state/entities")>()),
  useAllEnvironmentShellsBootstrapped: () => true,
  useQuietThreadProjection: vi.fn(() => null),
  useThreadProjection: vi.fn(() => null),
  useThreadShell: vi.fn(() => null),
}));
vi.mock("../../state/environments", async (original) => ({
  ...(await original<typeof import("../../state/environments")>()),
  useEnvironments: () => ({
    environments: [{ connection: { phase: "connected" } }],
    isReady: true,
  }),
  useEnvironment: () => null,
}));
vi.mock("../../state/use-atom-command", () => ({
  useAtomCommand: () => async () => ({ _tag: "Success" }),
}));

const finished = (index: number): SidebarThreadSummary => ({
  ...makeThreadFixture({ id: ThreadId.make(`done-${index}`), title: `Done ${index}` }),
  lastVisitedAt: "2026-11-01T00:00:00.000Z",
  latestRun: {
    runId: RunId.make(`run-${index}`),
    status: "completed",
    requestedAt: null,
    startedAt: null,
    completedAt: `2026-11-02T00:0${index}:00.000Z`,
    assistantMessageId: null,
  },
});

describe("sidebar inbox", () => {
  it("lists unread, waiting and failed threads inline, five at a time, and opens them directly", async () => {
    using _locale = testUiLocale("zh-CN");
    const waiting = {
      ...makeThreadFixture({ id: ThreadId.make("ask"), title: "Needs answer" }),
      hasPendingUserInput: true,
    };
    const navigate = vi.fn();
    await using screen = await render(
      <WorkbenchInbox
        threads={[waiting, ...Array.from({ length: 6 }, (_, index) => finished(index))]}
        projects={[]}
        activeKey={null}
        navigate={navigate}
      />,
    );
    const openPanel = vi.spyOn(useRightPanelStore.getState(), "open");
    const list = screen.getByRole("list", { name: "待我处理的会话" });
    // Waiting first, then the oldest unread results; the rest stay behind "更多".
    await expect.element(list.getByRole("button", { name: /Needs answer/ })).toBeVisible();
    await expect.element(list.getByRole("button", { name: /待回答/ })).toBeVisible();
    await expect.element(list.getByRole("button", { name: /Done 3/ })).toBeVisible();
    await expect.element(list.getByRole("button", { name: /Done 4/ })).not.toBeInTheDocument();
    await list.getByRole("button", { name: "更多 2" }).click();
    await list.getByRole("button", { name: /Done 5/ }).click();
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ threadId: "done-5" }));
    // The section title is a label now: it no longer sends the user to the task panel.
    await screen.getByText("待我处理", { exact: true }).click();
    expect(openPanel).not.toHaveBeenCalled();
  });
});

it("counts a lone unread result and keeps counting it beyond the preview limit", async () => {
  using _locale = testUiLocale("zh-CN");
  const navigate = vi.fn();
  const threads = Array.from({ length: 6 }, (_, index) => finished(index));
  await using screen = await render(
    <WorkbenchInbox
      threads={threads.slice(0, 1)}
      projects={[]}
      activeKey={null}
      navigate={navigate}
    />,
  );
  const list = screen.getByRole("list", { name: "待我处理的会话" });
  const count = () =>
    list.element().parentElement?.querySelector("[data-sidebar-cap] [aria-label]");
  expect(count()?.textContent).toBe("1");
  expect(count()?.getAttribute("aria-label")).toBe("1 项");
  await screen.rerender(
    <WorkbenchInbox threads={threads} projects={[]} activeKey={null} navigate={navigate} />,
  );
  expect(count()?.textContent).toBe("6");
  await list.getByRole("button", { name: "更多 1" }).click();
  expect(count()?.textContent).toBe("6");
  expect(list.element().querySelectorAll("[data-inbox-thread]")).toHaveLength(6);
});

it("keeps the selected card, quiet status lines and one dot across the sidebar themes", async () => {
  using _locale = testUiLocale("zh-CN");
  const themes = ["stardust", "ink", "graphite", "harbor", "mist", "grove"] as const;
  const runningId = RunId.make("running-plan");
  const parent = makeThreadFixture({
    id: ThreadId.make("selected-parent"),
    title: "Parent",
    runtime: {
      status: "running",
      activeRunId: runningId,
      providerInstanceId: ProviderInstanceId.make("codex"),
      providerName: "Codex",
      lastError: null,
      updatedAt: "2026-11-24T00:00:00Z",
    },
  });
  const child = {
    ...parent,
    id: ThreadId.make("selected-child"),
    title: "Child",
    hasPendingUserInput: true,
    lineage: {
      parentThreadId: parent.id,
      rootThreadId: parent.id,
      relationshipToParent: "subagent" as const,
    },
  };
  const result = finished(7);
  const base = makeThreadProjectionFixture();
  const resultMessage = {
    createdBy: "agent" as const,
    creationSource: "provider" as const,
    id: MessageId.make("sidebar-result-message"),
    threadId: result.id,
    runId: result.latestRun!.runId,
    nodeId: null,
    role: "assistant" as const,
    text: "**已完成核对**，详见记录。",
    attachments: [],
    streaming: false,
    createdAt: base.updatedAt,
    updatedAt: base.updatedAt,
  };
  using _result = vi.spyOn(entities, "useThreadProjection").mockImplementation((ref) =>
    ref?.threadId === result.id
      ? {
          environmentId: result.environmentId,
          projection: { ...base, messages: [resultMessage] },
        }
      : null,
  );
  using _plan = vi.spyOn(entities, "useQuietThreadProjection").mockImplementation((ref) =>
    ref?.threadId === parent.id
      ? {
          environmentId: parent.environmentId,
          projection: {
            ...base,
            runs: [
              {
                id: runningId,
                threadId: parent.id,
                ordinal: 1,
                providerInstanceId: parent.modelSelection.instanceId,
                modelSelection: parent.modelSelection,
                providerThreadId: null,
                userMessageId: MessageId.make("sidebar-plan-prompt"),
                rootNodeId: null,
                activeAttemptId: null,
                status: "running",
                requestedAt: base.updatedAt,
                startedAt: base.updatedAt,
                completedAt: null,
                checkpointId: null,
                contextHandoffId: null,
              },
            ],
            plans: [
              {
                id: PlanId.make("sidebar-plan"),
                threadId: parent.id,
                runId: runningId,
                nodeId: NodeId.make("sidebar-plan-node"),
                kind: "todo_list",
                status: "active",
                steps: [
                  { id: "read", text: "读资料", status: "completed" },
                  { id: "check", text: "核对", status: "running" },
                ],
              },
            ],
          },
        }
      : null,
  );
  using _shell = vi
    .spyOn(entities, "useThreadShell")
    .mockImplementation((ref) => (ref?.threadId === parent.id ? parent : null));
  const renderSelection = (thread: SidebarThreadSummary) => (
    <div data-sidebar="sidebar">
      <WorkbenchInbox
        threads={[parent, child, result]}
        projects={[]}
        activeKey={scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id))}
        navigate={vi.fn()}
      />
      <div data-thread-item>
        <div
          data-sidebar-row
          data-sidebar="menu-sub-button"
          aria-current="page"
          data-active="true"
        />
      </div>
    </div>
  );
  const root = document.documentElement;
  const precedingTheme = root.dataset.themeId ?? "default";
  const precedingDark = root.classList.contains("dark");
  using _theme = {
    [Symbol.dispose]: () => {
      root.classList.toggle("dark", precedingDark);
      applyThemePalette(precedingTheme, precedingDark ? "dark" : "light");
    },
  };
  await using screen = await render(renderSelection(parent));

  for (const [thread, state] of [
    [parent, "running"],
    [child, "needs-you"],
  ] as const) {
    await screen.rerender(renderSelection(thread));
    const row = screen.container.querySelector(
      `[data-active-work-row="${state}"][aria-current="page"]`,
    )!;
    const dot = row.querySelector("[data-active-work-dot]")!;
    for (const theme of themes) {
      for (const appearance of ["light", "dark"] as const) {
        root.classList.toggle("dark", appearance === "dark");
        applyThemePalette(theme, appearance);
        expect(getComputedStyle(row).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
        expect(dot.getBoundingClientRect().width).toBe(6);
        expect(screen.container.querySelector(".origin-left, [role=progressbar]")).toBeNull();
        const statuses = [...screen.container.querySelectorAll("[data-sidebar-status-line]")];
        expect(statuses.some((line) => line.textContent?.includes("有新结果 · 已完成核对"))).toBe(
          true,
        );
        expect(statuses.some((line) => line.textContent?.includes("工作中 · Codex"))).toBe(true);
        for (const status of statuses) {
          const time = status.parentElement!.querySelector(".workbench-row-time")!;
          expect(getComputedStyle(status).color).toBe(getComputedStyle(time).color);
          expect(status.querySelector("span")).toBeNull();
        }
        for (const slot of screen.container.querySelectorAll("[data-sidebar-status-slot]")) {
          expect(slot.getBoundingClientRect().width).toBe(14);
          expect(slot.children).toHaveLength(1);
        }
        const badge = screen.container.querySelector('[aria-label="2 项"]')!;
        expect(badge.textContent).toBe("2");
        await vi.waitFor(() =>
          expect(getComputedStyle(badge).color).toBe(getComputedStyle(statuses[0]!).color),
        );
        expect(badge.classList.contains("bg-warning")).toBe(false);
        for (const selected of screen.container.querySelectorAll('[aria-current="page"]')) {
          expect(
            selected.querySelector("[data-selected-marker], [data-sidebar-selection-marker]"),
          ).toBeNull();
          expect(getComputedStyle(selected, "::before").content, `${theme}/${appearance}`).toBe(
            "none",
          );
          expect(getComputedStyle(selected, "::after").content, `${theme}/${appearance}`).toBe(
            "none",
          );
        }
      }
    }
  }
});

it("removes attention state immediately while an inert row exits, including the last row", async () => {
  using _locale = testUiLocale("zh-CN");
  const waiting = {
    ...makeThreadFixture({ id: ThreadId.make("motion-ask"), title: "Motion answer" }),
    hasPendingUserInput: true,
  };
  const navigate = vi.fn();
  await using screen = await render(
    <WorkbenchInbox threads={[waiting]} projects={[]} activeKey={null} navigate={navigate} />,
  );
  using _timers = fakeTimers();
  const badge = screen.container.querySelector('[aria-label="1 项"]')!;
  using bounce = vi.spyOn(badge, "animate");
  await screen.rerender(
    <WorkbenchInbox threads={[]} projects={[]} activeKey={null} navigate={navigate} />,
  );
  const exit = screen.container.querySelector<HTMLElement>(".workbench-inbox-exit")!;
  expect(exit).not.toBeNull();
  expect(exit.inert).toBe(true);
  expect(exit.getAttribute("aria-hidden")).toBe("true");
  expect(screen.container.querySelector('[aria-label="0 项"]')).not.toBeNull();
  // A shrinking count already reads as "one less": only arrivals pop the badge.
  expect(bounce).not.toHaveBeenCalled();
  // The last row has nothing below to glide up, so it folds in place rather than being lifted.
  expect(exit.hasAttribute("data-flip-lifted")).toBe(false);
  await act(() => {
    vi.advanceTimersByTime(350);
  });
  expect(screen.container.querySelector(".workbench-inbox-exit")).toBeNull();
  expect(screen.container.querySelector('[aria-label="待我处理的会话"]')).toBeNull();
});

it("skips inbox exit and count animation when reduced motion is requested", async () => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  using _matches = vi.spyOn(media, "matches", "get").mockReturnValue(true);
  using _media = vi.spyOn(window, "matchMedia").mockReturnValue(media);
  const waiting = {
    ...makeThreadFixture({ id: ThreadId.make("reduced-ask"), title: "Reduced answer" }),
    hasPendingUserInput: true,
  };
  const navigate = vi.fn();
  await using screen = await render(
    <WorkbenchInbox threads={[waiting]} projects={[]} activeKey={null} navigate={navigate} />,
  );
  using animate = vi.spyOn(Element.prototype, "animate");
  await screen.rerender(
    <WorkbenchInbox threads={[]} projects={[]} activeKey={null} navigate={navigate} />,
  );
  expect(screen.container.querySelector(".workbench-inbox-exit")).toBeNull();
  expect(animate).not.toHaveBeenCalled();
});

it("does not exit hidden rows on collapse and restores a returning row before its exit deadline", async () => {
  using _locale = testUiLocale("zh-CN");
  const threads = Array.from({ length: 6 }, (_, index) => finished(index + 1));
  const navigate = vi.fn();
  await using screen = await render(
    <WorkbenchInbox threads={threads} projects={[]} activeKey={null} navigate={navigate} />,
  );
  await screen.getByRole("button", { name: "更多 1" }).click();
  await screen.getByRole("button", { name: "收起", exact: true }).click();
  expect(screen.container.querySelector(".workbench-inbox-exit")).toBeNull();
  using _timers = fakeTimers();
  await screen.rerender(
    <WorkbenchInbox
      threads={threads.slice(1)}
      projects={[]}
      activeKey={null}
      navigate={navigate}
    />,
  );
  expect(screen.container.querySelectorAll(".workbench-inbox-exit")).toHaveLength(1);
  await screen.rerender(
    <WorkbenchInbox threads={threads} projects={[]} activeKey={null} navigate={navigate} />,
  );
  expect(screen.container.querySelector(".workbench-inbox-exit")).toBeNull();
  await act(() => {
    vi.advanceTimersByTime(350);
  });
  expect(screen.container.querySelector('[data-inbox-thread="done-1"]')).not.toBeNull();
});

it("only lists linked board attention and opens its conversation without a task panel", async () => {
  board.data = {
    tasks: Array.from({ length: 6 }, (_, index) => ({
      folder: `/work/task-${index}`,
      title: `Board task ${index}`,
      state: "user" as const,
      notify_key: `task-${index}`,
      snoozed: false,
      stale: false,
      age_days: 1,
      steps: [{ id: "review", name: "Review", who: "user" as const, done: false }],
      missing: [],
      next: "Review",
      blocked: "",
      sessions: index === 0 ? ["linked"] : [],
      done_count: 0,
      total: 1,
      judge: "请确认交付",
    })),
    counts: { active: 6, user: 6, blocked: 0, agent: 0, stale: 0, done_week: 0, badge: 6 },
  };
  try {
    useRightPanelStore.setState({ byThreadKey: {} });
    const linked = makeThreadFixture({ id: ThreadId.make("linked"), title: "Linked thread" });
    const navigate = vi.fn();
    await using screen = await render(
      <WorkbenchInbox threads={[linked]} projects={[]} activeKey={null} navigate={navigate} />,
    );
    const boardRow = screen.getByRole("button", { name: /Board task 0/ });
    await expect.element(boardRow).toBeVisible();
    expect(boardRow.element().querySelector("[aria-label]")).toBeNull();
    await expect
      .element(screen.getByRole("button", { name: /Board task 5/ }))
      .not.toBeInTheDocument();
    await screen.getByRole("button", { name: /Board task 0/ }).click();
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ threadId: "linked" }));
    expect(useRightPanelStore.getState().byThreadKey).toEqual({});
    await expect
      .element(screen.getByRole("button", { name: /Board task 1/ }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /任务板.*项待处理/ }))
      .not.toBeInTheDocument();
  } finally {
    board.data = null;
  }
});

it("sends the continuation from the selected thread and immediately removes its actionable row", async () => {
  using _locale = testUiLocale("zh-CN");
  useResumeCardStore.setState({ selected: {}, hidden: {}, hiddenUntil: {} });
  const thread = {
    ...makeThreadFixture({ id: ThreadId.make("continue-inbox"), title: "继续扫码任务" }),
    hasPendingUserInput: true,
  };
  const send = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
  const ref = scopeThreadRef(thread.environmentId, thread.id);
  await using screen = await render(
    <>
      <WorkbenchInbox threads={[thread]} projects={[]} activeKey={null} navigate={() => {}} />
      <ThreadResumeCard
        threadRef={ref}
        progress={null}
        disabled={false}
        onContinue={send}
        onSnooze={undefined}
        onDismiss={undefined}
      />
    </>,
  );
  await screen
    .getByRole("list", { name: "待我处理的会话" })
    .getByRole("button", { name: /继续扫码任务/ })
    .click();
  await screen.getByRole("button", { name: "我处理好了，继续" }).click();
  expect(send).toHaveBeenCalledExactlyOnceWith("已处理好，继续。");
  await expect
    .element(
      screen
        .getByRole("list", { name: "待我处理的会话" })
        .getByRole("button", { name: /继续扫码任务/ }),
    )
    .not.toBeInTheDocument();
});

it("never keeps a finished sub-agent in Needs you, even after its result was opened", async () => {
  const previous = useResumeCardStore.getState();
  useResumeCardStore.setState({ selected: {}, hidden: {}, hiddenUntil: {} });
  try {
    const parent = finished(4);
    const base = finished(5);
    const child: SidebarThreadSummary = {
      ...base,
      title: "Child audit",
      lineage: {
        rootThreadId: parent.id,
        parentThreadId: parent.id,
        relationshipToParent: "subagent",
      },
    };
    const key = scopedThreadKey(scopeThreadRef(child.environmentId, child.id));
    // What opening the child used to record (InboxStrip registers artifacts as a new result).
    useResumeCardStore.getState().open({
      key,
      token: threadResumeToken(child, "有新结果"),
      ref: scopeThreadRef(child.environmentId, child.id),
      title: child.title,
      reason: "有新结果",
    });
    await using screen = await render(
      <WorkbenchInbox
        threads={[{ ...parent, lastVisitedAt: "2026-11-03T00:00:00.000Z" }, child]}
        projects={[]}
        activeKey={null}
        navigate={vi.fn()}
      />,
    );
    expect(screen.container.textContent).not.toMatch(/子任务|Child audit|Done 4/);
  } finally {
    useResumeCardStore.setState(previous, true);
  }
});
it("keeps a result out of Needs you while its background task runs, then lists it once", async () => {
  const previous = useResumeCardStore.getState();
  useResumeCardStore.setState({ selected: {}, hidden: {}, hiddenUntil: {} });
  try {
    const thread = finished(6);
    const key = scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id));
    // The result strip recorded the finished turn before the delegate finished.
    useResumeCardStore.getState().open({
      key,
      token: threadResumeToken(thread, "有新结果"),
      ref: scopeThreadRef(thread.environmentId, thread.id),
      title: thread.title,
      reason: "有新结果",
    });
    const waiting = {
      ...thread,
      pendingBackgroundTasks: [{ taskId: "delegate", kind: "subagent" as const }],
    };
    await using screen = await render(
      <WorkbenchInbox threads={[waiting]} projects={[]} activeKey={null} navigate={vi.fn()} />,
    );
    // Only the running row mentions it; no new-result card.
    expect(screen.container.textContent).toContain("Waiting for background tasks");
    expect(screen.container.textContent).not.toMatch(/New results?/);
    await screen.rerender(
      <WorkbenchInbox threads={[thread]} projects={[]} activeKey={null} navigate={vi.fn()} />,
    );
    expect(screen.container.textContent?.match(/New results?/g)).toHaveLength(1);
    // The finished task may still be fading out of Running, but only as an inert, hidden snapshot.
    const shown = screen.container.cloneNode(true) as HTMLElement;
    for (const hidden of shown.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
    expect(shown.textContent).not.toContain("Waiting for background tasks");
  } finally {
    useResumeCardStore.setState(previous, true);
  }
});
it("keeps an opened new result until explicit dismissal, including a persisted reload", async () => {
  const previous = useResumeCardStore.getState();
  const previousVisits = useUiStateStore.getState().threadLastVisitedAtById;
  useResumeCardStore.setState({ selected: {}, hidden: {}, hiddenUntil: {} });
  try {
    const thread = finished(2);
    const navigate = vi.fn();
    await using screen = await render(
      <WorkbenchInbox threads={[thread]} projects={[]} activeKey={null} navigate={navigate} />,
    );
    await screen.getByRole("button", { name: /Done 2/ }).click();
    const key = scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id));
    const request = useResumeCardStore.getState().selected[key]!;
    const visited = { ...thread, lastVisitedAt: "2026-11-03T00:00:00.000Z" };
    await screen.rerender(
      <WorkbenchInbox threads={[visited]} projects={[]} activeKey={key} navigate={navigate} />,
    );
    await expect.element(screen.getByRole("button", { name: /Done 2/ })).toBeVisible();
    await act(() => useResumeCardStore.getState().hide(request, 4102444800000));
    await expect.element(screen.getByRole("button", { name: /Done 2/ })).not.toBeInTheDocument();
    const persisted = localStorage.getItem("t3code:resume-attention:v1")!;
    useResumeCardStore.setState({ selected: {}, hidden: {}, hiddenUntil: {} });
    localStorage.setItem("t3code:resume-attention:v1", persisted);
    await act(() => useResumeCardStore.persist.rehydrate());
    expect(useResumeCardStore.getState().selected[key]).toEqual(request);
    await expect.element(screen.getByRole("button", { name: /Done 2/ })).not.toBeInTheDocument();
    await act(() => useResumeCardStore.getState().restore(request));
    await expect.element(screen.getByRole("button", { name: /Done 2/ })).toBeVisible();
    const row = screen.container.querySelector('[data-inbox-thread="done-2"]')!.closest("li")!;
    await userEvent.hover(row);
    await userEvent.click(
      row.querySelector<HTMLButtonElement>('[data-inbox-quick-action="done"]')!,
    );
    await vi.waitFor(() => expect(useResumeCardStore.getState().hidden[key]).toBe(request.token));
    await expect.element(screen.getByRole("button", { name: /Done 2/ })).not.toBeInTheDocument();
    expect(navigate).toHaveBeenCalledTimes(1);
  } finally {
    useResumeCardStore.setState(previous, true);
    useUiStateStore.setState({ threadLastVisitedAtById: previousVisits });
  }
});

it("V12 shows finish / archive / more on a result row and a handle button on a waiting row", async () => {
  using _locale = testUiLocale("zh-CN");
  applyThemePalette("apple", "light");
  await page.viewport(360, 420);
  const waiting = {
    ...makeThreadFixture({ id: ThreadId.make("ask-quick"), title: "Needs answer" }),
    hasPendingUserInput: true,
  };
  const navigate = vi.fn();
  await using _screen = await render(
    <div data-slot="sidebar" style={{ width: 300, padding: 8, background: "var(--sidebar)" }}>
      <WorkbenchInbox
        threads={[waiting, finished(1)]}
        projects={[]}
        activeKey={null}
        navigate={navigate}
      />
    </div>,
  );
  const resultRow = document.querySelector('[data-inbox-thread="done-1"]')!.closest("li")!;
  await userEvent.hover(resultRow);
  const strip = resultRow.querySelector<HTMLElement>("[data-inbox-quick-actions]")!;
  expect(strip.dataset.inboxQuickActions).toBe("finished");
  expect(
    [...strip.querySelectorAll("[data-inbox-quick-action]")].map((n) =>
      n.getAttribute("data-inbox-quick-action"),
    ),
  ).toEqual(["done", "archive", "more"]);
  await vi.waitFor(() => expect(getComputedStyle(strip).opacity).toBe("1"));
  const askRow = document.querySelector('[data-inbox-thread="ask-quick"]')!.closest("li")!;
  await userEvent.hover(askRow);
  const askStrip = askRow.querySelector<HTMLElement>("[data-inbox-quick-actions]")!;
  expect(askStrip.dataset.inboxQuickActions).toBe("needs-you");
  await userEvent.click(
    askStrip.querySelector<HTMLButtonElement>('[data-inbox-quick-action="open"]')!,
  );
  expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ threadId: "ask-quick" }));
});

it("hover actions take the time's place without re-truncating the title, lists today's done threads, and offers status changes", async () => {
  const settledTodayAt = "2026-11-24T12:00:00.000Z";
  using _clock = fakeTimers({ now: new Date(settledTodayAt), shouldAdvanceTime: true });
  using _locale = testUiLocale("zh-CN");
  applyThemePalette("apple", "light");
  await page.viewport(360, 520);
  const doneToday = {
    ...makeThreadFixture({ id: ThreadId.make("settled-today"), title: "Settled today" }),
    settledOverride: "settled" as const,
    settledAt: settledTodayAt,
  };
  await using screen = await render(
    <div data-slot="sidebar" style={{ width: 300, padding: 8, background: "var(--sidebar)" }}>
      <WorkbenchInbox
        threads={[finished(2), doneToday]}
        projects={[]}
        activeKey={null}
        navigate={vi.fn()}
      />
    </div>,
  );
  const row = document.querySelector('[data-inbox-thread="done-2"]')!.closest("li")!;
  const title = row.querySelector<HTMLElement>(".truncate")!;
  const restingWidth = title.getBoundingClientRect().width;
  await userEvent.hover(row);
  const strip = row.querySelector<HTMLElement>("[data-inbox-quick-actions]")!;
  await vi.waitFor(() => expect(getComputedStyle(strip).opacity).toBe("1"));
  // The title keeps its width (no re-truncation while the pointer sweeps the list); the time
  // gives way and the title's tail fades out beneath the actions instead of being drawn under them.
  expect(title.getBoundingClientRect().width).toBe(restingWidth);
  const fade = row.querySelector<HTMLElement>(".workbench-row-fade")!;
  await vi.waitFor(() =>
    expect(getComputedStyle(fade).getPropertyValue("--row-fade").trim()).toBe("0"),
  );
  expect(getComputedStyle(row.querySelector<HTMLElement>(".workbench-row-time")!).opacity).toBe(
    "0",
  );
  // Done today is collapsed until asked for.
  const doneHeader = screen.getByRole("button", { name: /今天已完成/ });
  await expect.element(doneHeader).toHaveAttribute("aria-expanded", "false");
  expect(document.querySelector('[data-inbox-done-thread="settled-today"]')).toBeNull();
  await doneHeader.click();
  await expect.element(screen.getByRole("button", { name: /Settled today/ })).toBeVisible();
  // The status dot opens the state list: done is checked, "in progress" follows the agent.
  await userEvent.click(row.querySelector<HTMLButtonElement>("[data-inbox-status]")!);
  await expect.element(page.getByRole("menuitem", { name: /待我处理/ })).toBeVisible();
  await expect
    .element(page.getByRole("menuitem", { name: /进行中/ }))
    .toHaveAttribute("aria-disabled", "true");
});

it("pops the badge when a request arrives and glides the rows it pushes down", async () => {
  using _locale = testUiLocale("zh-CN");
  const ask = (id: string) => ({
    ...makeThreadFixture({ id: ThreadId.make(id), title: id }),
    hasPendingUserInput: true,
  });
  const navigate = vi.fn();
  await using screen = await render(
    <WorkbenchInbox threads={[ask("older")]} projects={[]} activeKey={null} navigate={navigate} />,
  );
  const badge = screen.container.querySelector('[aria-label="1 项"]')!;
  const older = screen.container.querySelector('[data-inbox-thread="older"]')!.closest("li")!;
  using bounce = vi.spyOn(badge, "animate");
  using glide = vi.spyOn(older, "animate");
  await screen.rerender(
    <WorkbenchInbox
      threads={[ask("newer"), ask("older")]}
      projects={[]}
      activeKey={null}
      navigate={navigate}
    />,
  );
  expect(bounce).toHaveBeenCalledTimes(1);
  const rows = [...older.parentElement!.children];
  // Whichever row moved glides from its old place; it never animates layout properties.
  expect(rows.indexOf(older)).toBe(1);
  expect(glide).toHaveBeenCalledTimes(1);
  const frames = glide.mock.calls[0]![0] as Keyframe[];
  expect(String(frames[0]!.transform)).toMatch(/^translateY\(-/);
  expect(frames.some((frame) => "top" in frame || "height" in frame)).toBe(false);
});

it("keeps Done today mounted while it folds closed, then removes it", async () => {
  using _locale = testUiLocale("zh-CN");
  const today = "2026-11-24T12:00:00.000Z";
  using _timers = fakeTimers({ now: new Date(today), shouldAdvanceTime: true });
  const settled = {
    ...makeThreadFixture({ id: ThreadId.make("fold-today"), title: "Fold today" }),
    settledOverride: "settled" as const,
    settledAt: today,
  };
  const navigate = vi.fn();
  await using screen = await render(
    <WorkbenchInbox threads={[settled]} projects={[]} activeKey={null} navigate={navigate} />,
  );
  const header = screen.container.querySelector<HTMLButtonElement>(
    "[data-inbox-done-today] button",
  )!;
  expect(header).not.toBeNull();
  await header.click();
  const list = () =>
    screen.container.querySelector<HTMLElement>("[data-inbox-done-today] .workbench-disclosure");
  expect(list()).not.toBeNull();
  await header.click();
  const closing = list()!;
  expect(closing.hasAttribute("data-closing")).toBe(true);
  expect(closing.inert).toBe(true);
  await act(() => {
    vi.advanceTimersByTime(180);
  });
  expect(list()).toBeNull();
});

const askThread = (id: string) => ({
  ...makeThreadFixture({ id: ThreadId.make(id), title: id }),
  hasPendingUserInput: true,
});
const inboxRow = (id: string) =>
  document.querySelector(`[data-inbox-thread="${id}"]`)!.closest("li")!;
const afterMeasure = () => new Promise<void>((resolve) => queueMicrotask(resolve));

it("folds a leaving tail row in place instead of clipping it out of sight", async () => {
  using _locale = testUiLocale("zh-CN");
  await using screen = await render(
    <div data-slot="sidebar" style={{ width: 300, height: 200, overflow: "auto" }}>
      <WorkbenchInbox
        threads={[askThread("only")]}
        projects={[]}
        activeKey={null}
        navigate={vi.fn()}
      />
    </div>,
  );
  const height = inboxRow("only").getBoundingClientRect().height;
  await screen.rerender(
    <div data-slot="sidebar" style={{ width: 300, height: 200, overflow: "auto" }}>
      <WorkbenchInbox threads={[]} projects={[]} activeKey={null} navigate={vi.fn()} />
    </div>,
  );
  await afterMeasure();
  const leaving = screen.container.querySelector<HTMLElement>(".workbench-inbox-exit")!;
  // Nothing below it to glide, so it is not lifted: it still occupies (and folds) its own space.
  expect(leaving.hasAttribute("data-flip-lifted")).toBe(false);
  expect(leaving.getBoundingClientRect().height).toBeGreaterThan(height / 2);
});

it("pins rows that leave together at their own places while the rest close the gap", async () => {
  using _locale = testUiLocale("zh-CN");
  const all = ["a", "b", "c", "d"].map(askThread);
  await using screen = await render(
    <WorkbenchInbox threads={all} projects={[]} activeKey={null} navigate={vi.fn()} />,
  );
  const tops = all.map((thread) => inboxRow(thread.id).offsetTop);
  const [first, second] = [inboxRow(all[0]!.id), inboxRow(all[1]!.id)];
  await screen.rerender(
    <WorkbenchInbox threads={all.slice(2)} projects={[]} activeKey={null} navigate={vi.fn()} />,
  );
  await afterMeasure();
  expect(first.hasAttribute("data-flip-lifted")).toBe(true);
  expect(second.hasAttribute("data-flip-lifted")).toBe(true);
  expect([first.offsetTop, second.offsetTop]).toEqual([tops[0], tops[1]]);
});

it("starts a tail fold at its drawn position when a row above lifts in the same commit", async () => {
  using _locale = testUiLocale("zh-CN");
  const threads = ["a", "b", "c"].map(askThread);
  await using screen = await render(
    <WorkbenchInbox threads={threads} projects={[]} activeKey={null} navigate={vi.fn()} />,
  );
  const first = inboxRow("a");
  const tail = inboxRow("c");
  const drawnTop = tail.offsetTop;
  await screen.rerender(
    <WorkbenchInbox threads={[threads[1]!]} projects={[]} activeKey={null} navigate={vi.fn()} />,
  );
  await afterMeasure();
  expect(first.hasAttribute("data-flip-lifted")).toBe(true);
  expect(tail.hasAttribute("data-flip-lifted")).toBe(false);
  expect(tail.offsetTop).toBeLessThan(drawnTop);
  const fold = tail.getAnimations()[0]?.effect;
  expect(fold).toBeInstanceOf(KeyframeEffect);
  const transform = (fold as KeyframeEffect).getKeyframes()[0]?.transform;
  expect(typeof transform).toBe("string");
  expect(tail.offsetTop + new DOMMatrixReadOnly(String(transform)).m42).toBeCloseTo(drawnTop, 0);
});

it("lets an arriving row finish fading in when another update lands mid-arrival", async () => {
  using _locale = testUiLocale("zh-CN");
  const view = (ids: string[]) => (
    <WorkbenchInbox
      threads={ids.map(askThread)}
      projects={[]}
      activeKey={null}
      navigate={vi.fn()}
    />
  );
  await using screen = await render(view(["base"]));
  await screen.rerender(view(["base", "first"]));
  await afterMeasure();
  const first = inboxRow("first");
  const arrival = first.getAnimations().find((animation) => animation.playState === "running");
  expect(arrival).toBeDefined();
  await screen.rerender(view(["base", "first", "second"]));
  await afterMeasure();
  expect(arrival!.playState).toBe("running");
});

it("shows the hover actions whenever keyboard focus is in the row, like the title fade", async () => {
  using _locale = testUiLocale("zh-CN");
  await using screen = await render(
    <WorkbenchInbox threads={[finished(1)]} projects={[]} activeKey={null} navigate={vi.fn()} />,
  );
  await userEvent.tab();
  const row = inboxRow("done-1");
  expect(row.querySelector("[data-inbox-thread]")).toBe(document.activeElement);
  const strip = row.querySelector<HTMLElement>("[data-inbox-quick-actions]")!;
  await vi.waitFor(() => expect(getComputedStyle(strip).opacity).toBe("1"));
  void screen;
});

it("keeps rows that leave in separate updates in their places, and folds the true tail", async () => {
  using _locale = testUiLocale("zh-CN");
  const view = (ids: string[]) => (
    <WorkbenchInbox
      threads={ids.map(askThread)}
      projects={[]}
      activeKey={null}
      navigate={vi.fn()}
    />
  );
  await using screen = await render(view(["a", "b", "c"]));
  await screen.rerender(view(["b", "c"]));
  await afterMeasure();
  await screen.rerender(view(["b"]));
  await afterMeasure();
  const order = [...inboxRow("b").parentElement!.children].map((li) =>
    li.querySelector("[data-inbox-thread]")?.getAttribute("data-inbox-thread"),
  );
  expect(order).toEqual(["a", "b", "c"]);
  // c had nothing below it when it left: it folds in place, never pinned outside the list.
  expect(inboxRow("c").hasAttribute("data-flip-lifted")).toBe(false);
});

it("lets an exit take over a row that was still fading in, without brightening it", async () => {
  using _locale = testUiLocale("zh-CN");
  const view = (ids: string[]) => (
    <WorkbenchInbox
      threads={ids.map(askThread)}
      projects={[]}
      activeKey={null}
      navigate={vi.fn()}
    />
  );
  await using screen = await render(view(["base"]));
  await screen.rerender(view(["base", "late"]));
  await afterMeasure();
  const late = inboxRow("late");
  await screen.rerender(view(["base"]));
  await afterMeasure();
  // The arrival is gone and the exit starts from the opacity the arrival had reached.
  const animations = late.getAnimations();
  expect(animations).toHaveLength(1);
  const first = (animations[0]!.effect as KeyframeEffect).getKeyframes()[0]!;
  expect(Number(first.opacity)).toBeLessThan(1);
});

it("keeps Done today's last row on screen while the section folds away", async () => {
  using _locale = testUiLocale("zh-CN");
  const today = "2026-11-24T12:00:00.000Z";
  using _timers = fakeTimers({ now: new Date(today), shouldAdvanceTime: true });
  const settled = {
    ...makeThreadFixture({ id: ThreadId.make("last-done"), title: "Last done" }),
    settledOverride: "settled" as const,
    settledAt: today,
  };
  await using screen = await render(
    <WorkbenchInbox threads={[settled]} projects={[]} activeKey={null} navigate={vi.fn()} />,
  );
  await screen.container
    .querySelector<HTMLButtonElement>("[data-inbox-done-today] button")!
    .click();
  await expect.element(screen.getByRole("button", { name: /Last done/ })).toBeVisible();
  await screen.rerender(
    <WorkbenchInbox
      threads={[{ ...settled, settledOverride: null, settledAt: null }]}
      projects={[]}
      activeKey={null}
      navigate={vi.fn()}
    />,
  );
  const section = screen.container.querySelector<HTMLElement>("[data-inbox-done-today]")!;
  expect(section.hasAttribute("data-closing")).toBe(true);
  expect(section.querySelector('[data-inbox-done-thread="last-done"]')).not.toBeNull();
});

it("puts rows that leave together back in order and folds the tail from its own place", async () => {
  using _locale = testUiLocale("zh-CN");
  const view = (ids: string[]) => (
    <WorkbenchInbox
      threads={ids.map(askThread)}
      projects={[]}
      activeKey={null}
      navigate={vi.fn()}
    />
  );
  await using screen = await render(view(["a", "b", "c", "d", "e"]));
  const departing = ["c", "d", "e"].map((id) => ({ id, top: inboxRow(id).offsetTop }));
  await screen.rerender(view(["a", "b"]));
  await afterMeasure();
  const order = [...inboxRow("a").parentElement!.children].map((li) =>
    li.querySelector("[data-inbox-thread]")?.getAttribute("data-inbox-thread"),
  );
  expect(order).toEqual(["a", "b", "c", "d", "e"]);
  // Integer offsetTop can round a fractional row position differently during the fold.
  for (const { id, top } of departing) {
    expect(Math.abs(inboxRow(id).offsetTop - top)).toBeLessThanOrEqual(1);
  }
});

it("brings a row back mid-exit from exactly what was on screen, and leaves again the same way", async () => {
  using _locale = testUiLocale("zh-CN");
  const view = (ids: string[]) => (
    <WorkbenchInbox
      threads={ids.map(askThread)}
      projects={[]}
      activeKey={null}
      navigate={vi.fn()}
    />
  );
  await using screen = await render(view(["a", "b"]));
  await screen.rerender(view(["b"]));
  await afterMeasure();
  const a = inboxRow("a");
  const exit = a.getAnimations()[0]!;
  exit.pause();
  exit.currentTime = 90;
  const onScreen = Number(getComputedStyle(a).opacity);
  expect(onScreen).toBeGreaterThan(0);
  expect(onScreen).toBeLessThan(1);
  await screen.rerender(view(["a", "b"]));
  await afterMeasure();
  const back = a.getAnimations()[0]!;
  const backFrom = (back.effect as KeyframeEffect).getKeyframes()[0]!;
  expect(Number(backFrom.opacity)).toBeCloseTo(onScreen, 2);
  back.pause();
  back.currentTime = 60;
  const midReturn = Number(getComputedStyle(a).opacity);
  await screen.rerender(view(["b"]));
  await afterMeasure();
  const again = (a.getAnimations()[0]!.effect as KeyframeEffect).getKeyframes()[0]!;
  expect(Number(again.opacity)).toBeCloseTo(midReturn, 2);
});

it("keeps each sidebar menu's items while it fades closed, and drops menus of folding rows", async () => {
  using _locale = testUiLocale("zh-CN");
  const slowFade = document.createElement("style");
  slowFade.textContent =
    '[data-slot="menu-popup"][data-ending-style]{transition-duration:10s !important}';
  document.head.append(slowFade);
  try {
    const today = "2026-11-24T12:00:00.000Z";
    using _timers = fakeTimers({ now: new Date(today), shouldAdvanceTime: true });
    const settled = {
      ...makeThreadFixture({ id: ThreadId.make("menu-done"), title: "Menu done" }),
      settledOverride: "settled" as const,
      settledAt: today,
    };
    const view = (threads: SidebarThreadSummary[]) => (
      <div style={{ width: 300, height: 600 }}>
        <WorkbenchInbox threads={threads} projects={[]} activeKey={null} navigate={vi.fn()} />
      </div>
    );
    await using screen = await render(view([finished(1), settled]));
    const popup = () => document.querySelector<HTMLElement>('[data-slot="menu-popup"]');
    for (const trigger of ["[data-inbox-status]", '[data-inbox-quick-action="more"]']) {
      const row = inboxRow("done-1");
      await userEvent.hover(row);
      await userEvent.click(row.querySelector<HTMLElement>(trigger)!);
      await vi.waitFor(() => expect(popup()?.hasAttribute("data-open")).toBe(true));
      const open = {
        items: popup()!.querySelectorAll('[role="menuitem"]').length,
        height: popup()!.offsetHeight,
      };
      // An outside click lands on Base UI's modal backdrop while the menu is open.
      await userEvent.click(
        document.querySelector<HTMLElement>('[role="presentation"][data-base-ui-inert]')!,
        {
          position: { x: 5, y: 5 },
        },
      );
      await vi.waitFor(() => expect(popup()?.hasAttribute("data-ending-style")).toBe(true));
      expect(popup()!.querySelectorAll('[role="menuitem"]').length).toBe(open.items);
      expect(popup()!.offsetHeight).toBe(open.height);
      for (const animation of popup()!.getAnimations()) animation.finish();
      await vi.waitFor(() => expect(popup()).toBeNull());
    }
    // Done today: open the last row's status menu, then that row is restored elsewhere.
    await screen.container
      .querySelector<HTMLButtonElement>("[data-inbox-done-today] button")!
      .click();
    const doneRow = document.querySelector('[data-inbox-done-thread="menu-done"]')!.closest("li")!;
    await userEvent.hover(doneRow);
    await userEvent.click(doneRow.querySelector<HTMLElement>("[data-inbox-status]")!);
    await vi.waitFor(() => expect(popup()?.hasAttribute("data-open")).toBe(true));
    await screen.rerender(
      view([finished(1), { ...settled, settledOverride: null, settledAt: null }]),
    );
    // The folding snapshot carries no menus, so nothing outside the inert section stays live.
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="menu-popup"][data-open]')).toBeNull(),
    );
  } finally {
    slowFade.remove();
  }
});

it("keeps a leaving tail under its old neighbour when a row arrives above meanwhile", async () => {
  using _locale = testUiLocale("zh-CN");
  const view = (ids: string[]) => (
    <WorkbenchInbox
      threads={ids.map(askThread)}
      projects={[]}
      activeKey={null}
      navigate={vi.fn()}
    />
  );
  await using screen = await render(view(["a", "b", "c"]));
  // "0x" sorts above a (ties order by key): the new row lands at the top, as in X A B.
  await screen.rerender(view(["0x", "a", "b"]));
  await afterMeasure();
  const order = [...inboxRow("a").parentElement!.children].map((li) =>
    li.querySelector("[data-inbox-thread]")?.getAttribute("data-inbox-thread"),
  );
  // c sits right under its old neighbour b wherever the new row sorted; it is lifted exactly
  // when a live row follows it, and folds only as the true tail.
  expect(order.indexOf("c")).toBe(order.indexOf("b") + 1);
  const liveBelow = order.slice(order.indexOf("c") + 1).length > 0;
  expect(inboxRow("c").hasAttribute("data-flip-lifted")).toBe(liveBelow);
});

const drawnBox = (row: HTMLElement) => {
  const list = row.parentElement!.getBoundingClientRect();
  const box = row.getBoundingClientRect();
  return {
    top: box.top - list.top,
    height: box.height,
    opacity: Number(getComputedStyle(row).opacity),
  };
};
const pauseAt = (row: HTMLElement, ms: number) => {
  for (const animation of row.getAnimations()) {
    animation.pause();
    animation.currentTime = ms;
  }
};
const inboxView = (ids: string[]) => (
  <WorkbenchInbox threads={ids.map(askThread)} projects={[]} activeKey={null} navigate={vi.fn()} />
);

it("starts a tail's fold where it was drawn even when a row lands above it", async () => {
  using _locale = testUiLocale("zh-CN");
  await using screen = await render(inboxView(["a", "b", "c"]));
  const c = inboxRow("c");
  const before = drawnBox(c);
  await screen.rerender(inboxView(["0x", "a", "b"]));
  await afterMeasure();
  pauseAt(c, 0);
  expect(Math.abs(drawnBox(c).top - before.top)).toBeLessThan(1);
});

it("unfolds a returning tail from the height and place it had folded to", async () => {
  using _locale = testUiLocale("zh-CN");
  await using screen = await render(inboxView(["a", "b"]));
  const b = inboxRow("b");
  await screen.rerender(inboxView(["a"]));
  await afterMeasure();
  pauseAt(b, 120);
  const folded = drawnBox(b);
  await screen.rerender(inboxView(["0x", "a", "b"]));
  await afterMeasure();
  pauseAt(b, 0);
  const back = drawnBox(b);
  expect(Math.abs(back.top - folded.top)).toBeLessThan(1);
  expect(Math.abs(back.height - folded.height)).toBeLessThan(1);
});

it("keeps a returning row's fade when an unrelated row arrives mid-return", async () => {
  using _locale = testUiLocale("zh-CN");
  await using screen = await render(inboxView(["a", "b"]));
  const a = inboxRow("a");
  await screen.rerender(inboxView(["b"]));
  await afterMeasure();
  pauseAt(a, 90);
  await screen.rerender(inboxView(["a", "b"]));
  await afterMeasure();
  pauseAt(a, 30);
  const mid = drawnBox(a).opacity;
  expect(mid).toBeLessThan(1);
  await screen.rerender(inboxView(["a", "b", "c"]));
  await afterMeasure();
  expect(Math.abs(drawnBox(a).opacity - mid)).toBeLessThan(0.01);
});
