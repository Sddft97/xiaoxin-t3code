import { observeResize } from "~/lib/observeResize";
import { bindEffortFace } from "./GalaxyEffortFace";
import { drawEffortSky } from "./galaxyEffortSky";

export const effortThumbInset = 22.2;

export function mountEffortMotion(host: HTMLElement, initial: number) {
  const stage = host.querySelector<HTMLElement>(".gx-stage")!;
  const canvas = host.querySelector("canvas")!;
  const ctx = canvas.getContext("2d");
  const face = bindEffortFace(host);
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0,
    height = 0;
  let light = host.dataset.mode === "light";
  let visible = false,
    dragging = false;
  let frame = 0,
    timer = 0,
    lastPaint = 0,
    time = 0,
    lastInput = 0;
  let current = initial,
    from = initial,
    target = initial,
    started = 0,
    duration = 0;
  let tracking = false;
  let squash = 0,
    fromSquash = 0,
    kick = 0;

  function paintPose() {
    stage.style.setProperty("--gx-pos", String(current));
    stage.style.setProperty("--gx-squash", String(squash));
    face(current);
  }

  function stop() {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    frame = timer = lastPaint = 0;
    host.removeAttribute("data-awake");
  }

  function paint(now: number) {
    frame = 0;
    const reduced = preference.matches;
    const progress =
      reduced || duration === 0 ? 1 : Math.min(1, Math.max(0, (now - started) / duration));
    const live = dragging || progress < 1;
    if (lastPaint && !reduced && now - lastPaint < (live ? 1000 / 60 : 1000 / 30) - 0.8) {
      frame = requestAnimationFrame(paint);
      return;
    }
    const elapsed = lastPaint ? Math.min(60, now - lastPaint) : 16.7;
    if (!reduced) time += elapsed / 1000;
    lastPaint = now;
    const t = progress;
    const ease = t * t * (3 - 2 * t) + 0.46 * t * Math.sin(Math.PI * t) ** 2;
    const follow = tracking && !reduced && progress < 1;
    const next = follow
      ? target + (current - target) * Math.exp(-elapsed / 15)
      : from + (target - from) * ease;
    // Squash, lift, then settle. Retarget from the pose actually on screen.
    const nextSquash = fromSquash * (1 - t) + kick * Math.sin(t * Math.PI * 2) * (1 - t);
    if (next !== current || nextSquash !== squash || reduced) {
      current = next;
      squash = nextSquash;
      paintPose();
    }
    if (ctx && width && height)
      drawEffortSky(ctx, width, height, current, effortThumbInset, reduced ? 0 : time, light);
    if (reduced || (!live && now - lastInput >= 1500)) {
      stop();
    } else if (live) {
      frame = requestAnimationFrame(paint);
    } else {
      timer = window.setTimeout(() => {
        timer = 0;
        frame = requestAnimationFrame(paint);
      }, 19);
    }
  }

  function wake() {
    if (!visible || document.hidden) return;
    lastInput = performance.now();
    if (!preference.matches) host.setAttribute("data-awake", "");
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    if (!frame) frame = requestAnimationFrame(paint);
  }

  function move(ratio: number, held: boolean, follow = false) {
    const release = dragging && !held;
    dragging = held;
    tracking = follow;
    if (ratio !== target || release) {
      from = current;
      fromSquash = squash;
      target = ratio;
      started = performance.now();
      const jump = Math.abs(target - from);
      duration = follow ? 75 : 235;
      kick = preference.matches ? 0 : Math.min(0.11, jump * 0.26 + (release ? 0.048 : 0));
    }
    wake();
  }

  function resize(w: number, h: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = w;
    height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    wake();
  }
  const stopResize = observeResize(canvas, ([entry]) => {
    if (entry) resize(entry.contentRect.width, entry.contentRect.height);
  });
  function sync() {
    if (visible && !document.hidden) wake();
    else stop();
  }
  const visibility = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    sync();
  });
  visibility.observe(host);
  document.addEventListener("visibilitychange", sync);
  preference.addEventListener("change", wake);
  paintPose();
  return {
    wake,
    move,
    setAppearance(isLight: boolean) {
      light = isLight;
      wake();
    },
    dispose() {
      stop();
      visibility.disconnect();
      stopResize();
      document.removeEventListener("visibilitychange", sync);
      preference.removeEventListener("change", wake);
      canvas.width = canvas.height = 0;
    },
  };
}
