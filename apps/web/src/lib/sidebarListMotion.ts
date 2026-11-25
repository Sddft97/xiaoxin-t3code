import { observeResize } from "./observeResize";
import { MOTION } from "./workbenchMotion";

// A burst of arrivals (a project expanding, a reconnect refilling the list) appears at once.
const MAX_FADED_ARRIVALS = 8;
const ARRIVAL_TRAVEL = -4;

function progress(animation: Animation) {
  return animation.playState === "finished"
    ? 1
    : (animation.effect?.getComputedTiming().progress ?? 0);
}

/**
 * FLIP for sidebar lists: survivors glide on from where they are drawn, a few arrivals
 * fade in, and a `data-flip-exiting` child is pinned and lifted (`data-flip-lifted`) when rows
 * remain below it, else folds its own height. Only membership changes measure.
 */
export function observeSidebarList(node: HTMLElement | null) {
  if (!node) return;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const running = new Set<Animation>();
  const lifted = new Set<HTMLElement>();
  // One glide per row (replace-composited so Chromium keeps it on the compositor); arrivals are
  // tracked apart and never cancelled by a later glide, so an interrupted fade-in still completes.
  const glides = new Map<HTMLElement, { animation: Animation; offset: number }>();
  const arrivals = new Map<HTMLElement, Animation>();
  // Arrivals whose position a glide took over; they keep only their fade.
  const fadeOnly = new WeakSet<Animation>();
  /** How far a row is drawn from its layout box right now, from its glide and arrival. */
  const drawnOffset = (child: HTMLElement) => {
    const glide = glides.get(child);
    const arrival = arrivals.get(child);
    return (
      (glide ? glide.offset * (1 - progress(glide.animation)) : 0) +
      (arrival && !fadeOnly.has(arrival) ? ARRIVAL_TRAVEL * (1 - progress(arrival)) : 0)
    );
  };
  // Each leaving row's exit (a fade when lifted, a fold when it is the tail). Scripted rather
  // than CSS so a row that comes back can read exactly where it is drawn and carry on from there.
  const exits = new Map<HTMLElement, Animation>();
  // Where a folding tail is laid out while it folds: rows arriving above move its box, not it.
  const foldTops = new Map<HTMLElement, number>();
  const returning = new Map<HTMLElement, { opacity: number; top: number; height: number | null }>();
  /** What is on screen now: opacity and vertical offset from the row's layout box. */
  const sampleDrawn = (child: HTMLElement) => {
    const style = getComputedStyle(child);
    let dy = 0;
    if (style.transform && style.transform !== "none") {
      try {
        dy = new DOMMatrixReadOnly(style.transform).m42;
      } catch {
        dy = 0;
      }
    }
    return { opacity: Number(style.opacity), dy };
  };
  // Pinning needs the list to be the containing block; other lists only fold leaving rows.
  const canLift = getComputedStyle(node).position !== "static";
  const track = (animation: Animation) => {
    running.add(animation);
    const settle = () => running.delete(animation);
    void animation.finished.then(settle, settle);
    return animation;
  };
  const layoutTop = (element: HTMLElement) => {
    let top = 0;
    for (
      let current: HTMLElement | null = element;
      current;
      current = current.offsetParent as HTMLElement | null
    )
      top += current.offsetTop;
    return top;
  };
  const isLeaving = (child: Element) =>
    child instanceof HTMLElement && child.dataset.flipExiting !== undefined;
  const liveChildren = () =>
    Array.from(node.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && !isLeaving(child),
    );
  const measure = (children = liveChildren()) => {
    const origin = layoutTop(node);
    return new Map(children.map((child) => [child, layoutTop(child) - origin] as const));
  };
  let positions = measure();
  const cancel = () => {
    for (const animation of running) animation.cancel();
    running.clear();
    glides.clear();
    arrivals.clear();
    returning.clear();
    // A fold left behind by a cancelled exit would hold its row at zero height.
    for (const exit of exits.values()) exit.cancel();
    exits.clear();
    foldTops.clear();
  };
  const resized = () => {
    positions = measure();
  };
  let observedChildren = liveChildren();
  let stopResize = observeResize(observedChildren, resized);
  const update = () => {
    const animate = !media.matches && document.visibilityState === "visible";
    const children = Array.from(node.children) as HTMLElement[];
    // Sample every returning row before cancelling its exit or clearing its lifted position.
    const releasable = [...exits].filter(([child]) => !child.isConnected || !isLeaving(child));
    if (releasable.length > 0) {
      const origin = layoutTop(node);
      for (const [child] of releasable) {
        if (!child.isConnected) continue;
        const foldTop = foldTops.get(child);
        const drawn = sampleDrawn(child);
        const top = lifted.has(child)
          ? Number.parseFloat(child.style.top) || 0
          : (foldTop ?? layoutTop(child) - origin) + drawn.dy;
        const height = foldTop === undefined ? null : child.getBoundingClientRect().height;
        returning.set(child, { opacity: drawn.opacity, top, height });
      }
      for (const [child, exit] of releasable) {
        exits.delete(child);
        foldTops.delete(child);
        exit.cancel();
      }
    }
    for (const child of lifted) {
      if (child.isConnected && isLeaving(child)) continue;
      lifted.delete(child);
      delete child.dataset.flipLifted;
      child.style.removeProperty("top");
    }
    if (animate) {
      const leaving = children.flatMap((child, index) =>
        isLeaving(child) && !exits.has(child) && typeof child.animate === "function"
          ? [{ child, index }]
          : [],
      );
      if (leaving.length > 0) {
        const origin = layoutTop(node);
        const lastLive = children.findLastIndex((child) => !isLeaving(child));
        const lowestSurvivor = [...positions].reduce(
          (lowest, [child, top]) =>
            child.isConnected && !isLeaving(child) ? Math.max(lowest, top) : lowest,
          -Infinity,
        );
        const departing = leaving.map(({ child, index }) => {
          const drawn = sampleDrawn(child);
          const laidOut = layoutTop(child) - origin;
          const before = positions.get(child) ?? laidOut;
          const lift = canLift && (index < lastLive || lowestSurvivor > before);
          return { child, drawn, before, lift };
        });
        for (const { child, drawn, before, lift } of departing) {
          arrivals.get(child)?.cancel();
          arrivals.delete(child);
          glides.get(child)?.animation.cancel();
          glides.delete(child);
          if (!lift) continue;
          child.style.top = `${before + drawn.dy}px`;
          child.dataset.flipLifted = "";
          lifted.add(child);
          exits.set(
            child,
            child.animate([{ opacity: drawn.opacity }, { opacity: 0 }], {
              duration: MOTION.exit,
              easing: MOTION.ease.exit,
              fill: "forwards",
            }),
          );
        }
        const folding = departing.filter(({ lift }) => !lift);
        if (folding.length > 0) {
          // Lifting another departure can move the tail's layout box before its fold starts.
          const foldedOrigin = layoutTop(node);
          const layouts = folding.map(({ child, ...row }) => ({
            ...row,
            child,
            laidOut: layoutTop(child) - foldedOrigin,
            height: child.offsetHeight,
          }));
          for (const { child, drawn, before, laidOut, height } of layouts) {
            foldTops.set(child, laidOut);
            exits.set(
              child,
              child.animate(
                [
                  {
                    height: `${height}px`,
                    overflow: "hidden",
                    opacity: drawn.opacity,
                    transform: `translateY(${before + drawn.dy - laidOut}px)`,
                  },
                  { height: "0px", overflow: "hidden", opacity: 0, transform: "translateY(0)" },
                ],
                { duration: MOTION.exit, easing: MOTION.ease.exit, fill: "forwards" },
              ),
            );
          }
        }
      }
    }
    const nextChildren = liveChildren();
    const next = measure(nextChildren);
    if (animate) {
      const arriving = [...next.keys()].filter(
        (child) => !positions.has(child) && !returning.has(child),
      );
      // Height reads must finish before any survivor's animation changes layout or style.
      const heights = new Map<HTMLElement, number>();
      for (const child of nextChildren) {
        if (
          returning.get(child)?.height != null ||
          (arriving.length <= MAX_FADED_ARRIVALS && !positions.has(child) && !returning.has(child))
        ) {
          heights.set(child, child.offsetHeight);
        }
      }
      for (const [child, top] of next) {
        if (typeof child.animate !== "function") continue;
        const before = positions.get(child);
        try {
          const back = returning.get(child);
          if (back) {
            // Came back mid-exit: fade (and unfold) up from what was on screen, tracked like an
            // arrival so a later reorder replaces only its glide, never its fade.
            returning.delete(child);
            const fade = track(
              child.animate(
                back.height === null
                  ? [{ opacity: back.opacity }, { opacity: 1 }]
                  : [
                      { opacity: back.opacity, height: `${back.height}px`, overflow: "hidden" },
                      { opacity: 1, height: `${heights.get(child)!}px`, overflow: "hidden" },
                    ],
                { duration: MOTION.enter, easing: MOTION.ease.standard },
              ),
            );
            fadeOnly.add(fade);
            arrivals.set(child, fade);
            const settleFade = () => {
              if (arrivals.get(child) === fade) arrivals.delete(child);
            };
            void fade.finished.then(settleFade, settleFade);
            const offset = back.top - top;
            if (Math.abs(offset) < 0.5) continue;
            const animation = track(
              child.animate(
                [{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }],
                { duration: MOTION.enter, easing: MOTION.ease.standard },
              ),
            );
            glides.set(child, { animation, offset });
            const settle = () => {
              if (glides.get(child)?.animation === animation) glides.delete(child);
            };
            void animation.finished.then(settle, settle);
            continue;
          }
          if (before === undefined) {
            if (arriving.length > MAX_FADED_ARRIVALS || heights.get(child) === 0) continue;
            const arrival = track(
              child.animate(
                [
                  { opacity: 0, transform: `translateY(${ARRIVAL_TRAVEL}px)` },
                  { opacity: 1, transform: "translateY(0)" },
                ],
                { duration: MOTION.enter, easing: MOTION.ease.standard },
              ),
            );
            arrivals.set(child, arrival);
            const settle = () => {
              if (arrivals.get(child) === arrival) arrivals.delete(child);
            };
            void arrival.finished.then(settle, settle);
            continue;
          }
          // Start from where the row is drawn now: its old place plus what is left of its glide
          // and arrival. The glide takes over position; a running arrival keeps only its fade.
          const current = glides.get(child);
          const carried = drawnOffset(child);
          const offset = before + carried - top;
          current?.animation.cancel();
          glides.delete(child);
          if (Math.abs(offset) < 0.5) continue;
          const animation = track(
            child.animate(
              [{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }],
              { duration: MOTION.enter, easing: MOTION.ease.standard },
            ),
          );
          glides.set(child, { animation, offset });
          const arrival = arrivals.get(child);
          if (arrival && !fadeOnly.has(arrival) && arrival.effect instanceof KeyframeEffect) {
            arrival.effect.setKeyframes([{ opacity: 0 }, { opacity: 1 }]);
            fadeOnly.add(arrival);
          }
          const settle = () => {
            if (glides.get(child)?.animation === animation) glides.delete(child);
          };
          void animation.finished.then(settle, settle);
        } catch {
          /* A missing animation backend must not prevent list updates. */
        }
      }
    }
    returning.clear();
    positions = next;
    if (
      nextChildren.length !== observedChildren.length ||
      nextChildren.some((child, index) => child !== observedChildren[index])
    ) {
      stopResize();
      observedChildren = nextChildren;
      stopResize = observeResize(observedChildren, resized);
    }
  };
  // Both observers can fire for one commit; measure once so a row never glides twice.
  let queued = false;
  let disposed = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!disposed) update();
    });
  };
  // Membership: direct children only, so text changes inside a row never measure the list.
  const membership = new MutationObserver(schedule);
  membership.observe(node, { childList: true });
  // A row starting (or stopping) to leave changes one attribute, not the child list.
  const leaving = new MutationObserver((records) => {
    if (records.some((record) => record.target.parentNode === node)) schedule();
  });
  leaving.observe(node, { subtree: true, attributeFilter: ["data-flip-exiting"] });
  media.addEventListener("change", cancel);
  document.addEventListener("visibilitychange", cancel);
  return () => {
    disposed = true;
    membership.disconnect();
    leaving.disconnect();
    stopResize();
    cancel();
    media.removeEventListener("change", cancel);
    document.removeEventListener("visibilitychange", cancel);
  };
}
