import "~/index.css";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { testUiLocale } from "../../../test/uiLocale";
import { act, render } from "../../../test/render";
import { ToastProvider } from "../ui/toast";
import { useMemoryProposalNotification } from "./useMemoryProposalNotification";
import { AppRouteModal } from "../AppRouteModal";
import { SidebarProvider } from "../ui/sidebar";
import { SettingsSidebarNav } from "./SettingsSidebarNav";
import { settingsNavGroups, SETTINGS_SECTION_LABELS } from "./settingsSearch";

const memory = vi.hoisted(() => ({ pending: [] as { id: string }[] }));
vi.mock("../../state/environments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../state/environments")>()),
  useEnvironments: () => ({
    environments: [
      {
        environmentId: "memory-test",
        connection: { phase: "connected" },
        serverConfig: { environment: { capabilities: {} }, settings: { memory } },
      },
    ],
  }),
}));

vi.mock("./useAvailableSettingsSearchItems", () => ({
  useAvailableSettingsSearchItems: () => [
    { id: "theme", title: "Theme", to: "/settings/appearance" },
  ],
  useHasSecretProvidersEnvironment: () => false,
}));
vi.mock("../chat/GlobalVoiceInputIndicator", () => ({ GlobalVoiceInputIndicator: () => null }));

it("ignores composing keys in the search", async () => {
  await page.viewport(1280, 800);
  await using screen = await render(
    <SidebarProvider defaultOpen>
      <SettingsSidebarNav pathname="/settings/general" />
    </SidebarProvider>,
    { router: "/settings/general" },
  );
  const search = page.getByRole("combobox", { name: "Search settings" });
  await search.fill("theme");
  await expect.element(page.getByRole("option", { name: /Theme/ })).toBeVisible();

  for (const composition of [
    { key: "Enter", isComposing: true, keyCode: 13 },
    { key: "Enter", isComposing: false, keyCode: 229 },
    { key: "Escape", isComposing: true, keyCode: 27 },
    { key: "Escape", isComposing: false, keyCode: 229 },
    { key: "ArrowDown", isComposing: true, keyCode: 40 },
    { key: "ArrowUp", isComposing: true, keyCode: 38 },
  ]) {
    const event = new KeyboardEvent("keydown", { ...composition, bubbles: true, cancelable: true });
    await act(() => search.element().dispatchEvent(event));
    expect(event.defaultPrevented, JSON.stringify(composition)).toBe(false);
    expect(screen.router?.state.location.pathname).toBe("/settings/general");
    await expect.element(search).toHaveValue("theme");
  }

  await userEvent.keyboard("{Enter}");
  await vi.waitFor(() =>
    expect(screen.router?.state.location.pathname).toBe("/settings/appearance"),
  );
});

it("Esc clears a search of spaces and a held Esc keeps Settings open", async () => {
  await using _screen = await render(
    <AppRouteModal label="Settings">
      <SidebarProvider defaultOpen>
        <SettingsSidebarNav pathname="/settings/general" />
      </SidebarProvider>
    </AppRouteModal>,
    { router: "/settings/general" },
  );
  const settings = page.getByRole("dialog", { name: "Settings" });
  const search = page.getByRole("combobox", { name: "Search settings" });
  await expect.element(settings).toHaveFocus();

  for (const text of ["theme", "   "]) {
    await search.fill(text);
    await userEvent.keyboard("{Escape}");
    await expect.element(search).toHaveValue("");
    await expect.element(search).toHaveFocus();
    await act(() =>
      search.element().dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          repeat: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    await expect.element(settings).toHaveAttribute("data-open");
  }

  await userEvent.keyboard("{Escape}");
  await expect.element(settings).not.toBeInTheDocument();
});

function renderNav() {
  return render(
    <SidebarProvider defaultOpen>
      <SettingsSidebarNav pathname="/settings/general" />
    </SidebarProvider>,
    { router: "/settings/general" },
  );
}

it("opens search from the physical Slash and F keys on non-US layouts", async () => {
  await using _screen = await renderNav();
  const search = page.getByRole("combobox", { name: "Search settings" });

  for (const { init, opens } of [
    { init: { key: "/", code: "Digit7", shiftKey: true }, opens: true }, // German Shift+7
    { init: { key: ".", code: "Slash" }, opens: true }, // Russian Slash key
    { init: { key: "а", code: "KeyF", ctrlKey: true }, opens: true }, // Russian Ctrl+F
    { init: { key: "?", code: "Slash", shiftKey: true }, opens: false },
  ]) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const event = new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true });
    await act(() => document.body.dispatchEvent(event));
    expect(event.defaultPrevented, JSON.stringify(init)).toBe(opens);
    if (opens) await expect.element(search).toHaveFocus();
  }
});

it("moves Tab through every settings section", async () => {
  await page.viewport(1280, 800);
  await using _screen = await renderNav();
  await userEvent.click(page.getByRole("combobox", { name: "Search settings" }));

  const sections = settingsNavGroups(false)
    .flatMap((group) => group.paths)
    .map((to) => SETTINGS_SECTION_LABELS[to]);
  const tabbed: string[] = [];
  for (let step = 0; step < sections.length; step += 1) {
    await userEvent.tab();
    const section = document.activeElement?.closest("[data-settings-section]");
    if (!section) break;
    tabbed.push(section.textContent ?? "");
  }
  expect(tabbed).toEqual(sections);
});

it.each([1280, 390])("names each group by a heading outside it at %ipx wide", async (width) => {
  await page.viewport(width, 800);
  await using _screen = await renderNav();

  for (const name of ["Agents", "Code", "Connections"]) {
    const heading = page.getByRole("heading", { name, level: 3 });
    await expect.element(heading).toBeInTheDocument();
    const group = page.getByRole("group", { name }).element();
    expect(group.getAttribute("aria-labelledby")).toBe(heading.element().id);
    expect(group.contains(heading.element()), `the ${name} heading is inside its group`).toBe(
      false,
    );
  }
  const groups = page.getByRole("group").elements();
  expect(groups).toHaveLength(settingsNavGroups(false).length);
  for (const group of groups) {
    const first = group.querySelector("[data-settings-section]")?.textContent;
    const heading = document.getElementById(group.getAttribute("aria-labelledby") ?? "");
    expect(heading?.tagName, `the group starting at ${first} has no heading`).toBe("H3");
  }
  expect(page.getByRole("tree").query()).toBeNull();
});

it.each(["light", "dark"] as const)(
  "shows the memory entry under 智能体 in %s mode",
  async (theme) => {
    using _locale = testUiLocale("zh-CN");
    await page.viewport(1100, 900);
    document.documentElement.classList.toggle("dark", theme === "dark");
    const container = document.createElement("div");
    container.dataset.testid = "memory-sidebar-frame";
    container.className = "h-screen w-64 bg-sidebar text-sidebar-foreground";
    memory.pending = [{ id: "pending-proposal" }];
    try {
      await using screen = await render(
        <SidebarProvider defaultOpen>
          <SettingsSidebarNav pathname="/settings/memory" />
        </SidebarProvider>,
        { router: "/settings/memory", container },
      );
      const agents = screen.getByRole("group", { name: "智能体" });
      const memoryEntry = agents.getByRole("button", { name: /记忆/ });
      await expect.element(memoryEntry).toBeVisible();
      expect(memoryEntry.element().textContent).toMatch(/记忆\s*1/);
      expect(memoryEntry.element().getAttribute("aria-current")).toBe("page");
      const previousRow = memoryEntry.element().closest("li")?.previousElementSibling;
      expect(
        previousRow
          ?.querySelector("[data-settings-section]")
          ?.getAttribute("data-settings-section"),
      ).toBe("/settings/threads");
      if (import.meta.env.VITE_STARDUST_FIX_SHOTS) {
        await page.screenshot({
          path: `${import.meta.env.VITE_STARDUST_FIX_SHOTS}/01-memory-sidebar-${theme}.png`,
          element: page.getByTestId("memory-sidebar-frame"),
        });
      }
    } finally {
      memory.pending = [];
      document.documentElement.classList.remove("dark");
    }
  },
);

function MemoryNotice() {
  useMemoryProposalNotification();
  return null;
}

it("offers review and dismiss for a new memory proposal", async () => {
  using _locale = testUiLocale("zh-CN");
  await page.viewport(1050, 620);
  memory.pending = [];
  const renderNotice = () => (
    <ToastProvider>
      <MemoryNotice />
    </ToastProvider>
  );
  await using screen = await render(renderNotice(), { router: "/settings/general" });
  const emit = async (id: string) => {
    memory.pending = [{ id }];
    await screen.rerender(renderNotice());
    await expect.element(page.getByText("批准前不会提供给模型。")).toBeVisible();
  };
  try {
    await emit("first");
    const review = page.getByRole("button", { name: "去审核" });
    const later = page.getByRole("button", { name: "稍后" });
    await expect.element(review).toBeVisible();
    await expect.element(later).toBeVisible();
    if (import.meta.env.VITE_STARDUST_FIX_SHOTS) {
      const root = review.element().closest<HTMLElement>("[data-position]")!;
      root.dataset.testid = "proposal-toast-capture";
      await page.screenshot({
        path: `${import.meta.env.VITE_STARDUST_FIX_SHOTS}/02-memory-proposal-toast.png`,
        element: page.getByTestId("proposal-toast-capture"),
      });
    }
    await later.click();
    await expect.element(review).not.toBeInTheDocument();
    await emit("second");
    await review.click();
    await vi.waitFor(() => expect(screen.router?.state.location.pathname).toBe("/settings/memory"));
  } finally {
    memory.pending = [];
  }
});
