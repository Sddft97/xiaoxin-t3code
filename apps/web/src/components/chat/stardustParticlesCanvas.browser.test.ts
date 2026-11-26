import { expect, it, vi } from "vite-plus/test";
import { mountStardustParticles } from "./stardustParticlesCanvas";

it("suspends the particle timer when the chat column has no drawable area", async () => {
  const canvas = document.createElement("canvas");
  canvas.style.width = "240px";
  canvas.style.height = "120px";
  document.body.append(canvas);
  const engine = mountStardustParticles(canvas);
  expect(engine).not.toBeNull();
  try {
    window.dispatchEvent(new Event("focus"));
    engine!.setPaused(false);
    await vi.waitFor(() => expect(canvas.dataset.motion).toBe("running"));

    canvas.style.width = "0";
    await vi.waitFor(() => expect(canvas.dataset.motion).toBe("paused"));

    canvas.style.width = "240px";
    await vi.waitFor(() => expect(canvas.dataset.motion).toBe("running"));

    engine!.setPaused(true);
    await vi.waitFor(() => expect(canvas.dataset.motion).toBe("paused"));
  } finally {
    engine?.destroy();
    canvas.remove();
  }
});
