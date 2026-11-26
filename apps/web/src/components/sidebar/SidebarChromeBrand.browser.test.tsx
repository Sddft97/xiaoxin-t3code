import "~/index.css";
import { describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { SidebarProvider } from "../ui/sidebar";
import { render } from "../../../test/render";
import { testUiLocale } from "../../../test/uiLocale";
import { SidebarChromeHeader } from "./SidebarChrome";

// A stable release has no dev/nightly artwork behind the brand.
vi.mock("../SidebarStageBackdrop", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../SidebarStageBackdrop")>()),
  useEnvironmentStageLabel: () => "",
}));

function frame(width: number) {
  const el = document.createElement("div");
  el.style.cssText = `width:${width}px;background:var(--color-background, transparent);padding:0;`;
  el.setAttribute("data-testid", "sidebar-frame");
  return el;
}

const CASES = (["zh-CN", "en"] as const).flatMap((locale) =>
  (["light", "dark"] as const).flatMap((theme) =>
    (
      [
        ["expanded", 256],
        ["narrow", 96],
      ] as const
    ).map(([mode, width]) => ({ locale, theme, mode, width })),
  ),
);

describe("sidebar brand", () => {
  it.for(CASES)(
    "shows the star mark and the name only when wide ($locale, $theme, $mode)",
    async ({ locale, theme, mode, width }) => {
      await page.viewport(1280, 800);
      using _locale = testUiLocale(locale);
      document.documentElement.classList.toggle("dark", theme === "dark");
      try {
        await using screen = await render(
          <SidebarProvider>
            <div className="w-full bg-sidebar text-foreground" data-app-sidebar="">
              <SidebarChromeHeader isElectron={false} />
            </div>
          </SidebarProvider>,
          { container: frame(width) },
        );
        const link = screen.container.querySelector<HTMLElement>("a[href='/']");
        expect(link).not.toBeNull();
        // The accessible name uses the same product brand as the visible label.
        expect(link!.getAttribute("aria-label")).toBe(
          locale === "zh-CN" ? "星尘首页" : "Stardust home",
        );
        expect(link!.querySelector("[data-stardust-mark]")).not.toBeNull();
        const label = link!.querySelector<HTMLElement>("[data-stardust-label]");
        expect(label).not.toBeNull();
        expect(getComputedStyle(label!).display === "none").toBe(mode === "narrow");
        if (mode === "expanded") {
          expect(label!.textContent).toBe(locale === "zh-CN" ? "星尘" : "Stardust");
          expect(link!.textContent).not.toContain("T3");
        }
        // Static: nothing in the brand animates.
        for (const node of link!.querySelectorAll("*")) {
          expect(getComputedStyle(node).animationName).toBe("none");
        }
      } finally {
        document.documentElement.classList.remove("dark");
      }
    },
  );
});
