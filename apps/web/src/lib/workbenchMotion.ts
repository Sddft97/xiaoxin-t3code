import { useLayoutEffect, useRef, useState } from "react";
import { useMediaQuery } from "~/hooks/useMediaQuery";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** The motion language; mirrors the `--motion-*` variables documented in index.css. */
export const MOTION = {
  ease: {
    standard: "cubic-bezier(0.32, 0.72, 0, 1)",
    exit: "cubic-bezier(0.4, 0, 0.85, 0.6)",
    pop: "cubic-bezier(0.22, 1.16, 0.36, 1)",
  },
  press: 80,
  hover: 120,
  swap: 160,
  exit: 180,
  enter: 220,
  expand: 240,
  pop: 240,
} as const;

export const workbenchEase = MOTION.ease.standard;

/** One finite DOM animation; preference changes and unmounts cancel it. */
export function animateWorkbenchOnce(
  element: Element,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
): () => void {
  const preference = window.matchMedia(REDUCED_MOTION);
  if (preference.matches || typeof element.animate !== "function") return () => {};
  let animation: Animation;
  try {
    animation = element.animate(frames, options);
  } catch {
    // Older clients may not support a pseudo-element animation; the live DOM is already correct.
    return () => {};
  }
  const stop = () => {
    preference.removeEventListener("change", stop);
    animation.removeEventListener("finish", stop);
    animation.removeEventListener("cancel", stop);
    animation.cancel();
  };
  preference.addEventListener("change", stop);
  animation.addEventListener("finish", stop);
  animation.addEventListener("cancel", stop);
  return stop;
}

export function useTrailPillWidth(label: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<{ label: string; width: number } | null>(null);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Measure the committed pill and animate only its changed intrinsic width.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const width = element.getBoundingClientRect().width;
    const before = previous.current;
    previous.current = { label, width };
    if (before === null || before.label === label || before.width === width) return;
    return animateWorkbenchOnce(
      element,
      [{ width: `${before.width}px` }, { width: `${width}px` }],
      { duration: MOTION.pop, easing: MOTION.ease.pop },
    );
  }, [label]);
  return ref;
}

/**
 * A count confirms that something arrived: it pops once when it grows. A shrinking count
 * already reads as "one less" and stays still, so clearing a list never flickers.
 */
export function useInboxCountBounce(count: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(count);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Animate the DOM badge once when the committed count grows.
  useLayoutEffect(() => {
    const grew = count > previous.current;
    previous.current = count;
    if (!grew || !ref.current) return;
    return animateWorkbenchOnce(
      ref.current,
      // Three frames: an overshooting curve would overshoot each segment and read as a shake.
      [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }],
      { duration: MOTION.pop, easing: MOTION.ease.standard },
    );
  }, [count]);
  return ref;
}

/**
 * A mark that swaps (a status dot changing meaning) settles in instead of jumping. The
 * first render stays still, so a sidebar full of rows never animates on load.
 */
export function useSwapIn<T extends HTMLElement = HTMLSpanElement>(value: string | null) {
  const ref = useRef<T>(null);
  const previous = useRef(value);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Animate the DOM mark once when the committed value changes.
  useLayoutEffect(() => {
    const changed = previous.current !== value;
    previous.current = value;
    if (!changed || value === null || !ref.current) return;
    return animateWorkbenchOnce(
      ref.current,
      [
        { opacity: 0, transform: "scale(0.78)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: MOTION.swap, easing: MOTION.ease.standard },
    );
  }, [value]);
  return ref;
}

/** A leaving snapshot remembers the row it sat under when it left (null: it was first). */
export type ExitAnchor = { exitAfter: string | null };

/**
 * Puts leaving snapshots back where they stood: each goes right under the row it sat under when
 * it left. `exiting` is newest removal batch first, each batch in list order, so a row that
 * left under another leaving row finds it already placed. Anchoring to a neighbour, not an
 * index, survives rows arriving meanwhile (A B C → X A B keeps C under B, at the tail).
 */
export function withExitingRows<T extends { key: string; index: number }>(
  rows: readonly T[],
  exiting: readonly (T & ExitAnchor)[],
): T[] {
  const displayed: T[] = [...rows];
  for (const row of exiting) {
    const under =
      row.exitAfter === null ? -1 : displayed.findIndex((other) => other.key === row.exitAfter);
    // Its neighbour has already gone as well: fall back to where it was in its own list.
    const at =
      row.exitAfter !== null && under === -1 ? Math.min(row.index, displayed.length) : under + 1;
    displayed.splice(at, 0, row);
  }
  return displayed;
}

function serializeRow(row: unknown) {
  return JSON.stringify(row);
}

export function useInboxExitRows<T extends { key: string }>(
  rows: readonly T[],
  allKeys: Set<string>,
  /** What a row shows; cheaper than serialising rows that carry whole thread objects. */
  shown: (row: T) => string = serializeRow,
  /** How long the caller's exit CSS plays; the snapshot is removed when it ends. */
  exitMs = 350,
) {
  const reduced = useMediaQuery(REDUCED_MOTION);
  // The leaving snapshot must show the row as it last looked, so what it shows is part of this.
  const signature = rows.map((row) => `${row.key}\u0001${shown(row)}`).join("\u0000");
  const [previous, setPrevious] = useState({ signature, rows });
  const [exiting, setExiting] = useState<readonly (T & ExitAnchor)[]>([]);
  const timers = useRef(new Map<T & ExitAnchor, ReturnType<typeof setTimeout>>());
  if (previous.signature !== signature) {
    setPrevious({ signature, rows });
    const removed = previous.rows.flatMap((row, index) =>
      allKeys.has(row.key)
        ? []
        : [{ ...row, exitAfter: index > 0 ? previous.rows[index - 1]!.key : null }],
    );
    if (removed.length && !reduced) {
      // Newest batch first, in list order: withExitingRows replays them in this order.
      setExiting([...removed, ...exiting.filter((row) => !removed.some((r) => r.key === row.key))]);
    }
  }
  if (reduced && exiting.length) setExiting([]);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Each inert DOM snapshot gets one removal deadline, independent of later removals.
  useLayoutEffect(() => {
    const pending = timers.current;
    for (const [row, timer] of pending) {
      if (reduced || !exiting.includes(row)) {
        clearTimeout(timer);
        pending.delete(row);
      }
    }
    if (reduced) return;
    for (const row of exiting) {
      if (pending.has(row)) continue;
      pending.set(
        row,
        setTimeout(() => {
          pending.delete(row);
          setExiting((current) => current.filter((entry) => entry !== row));
        }, exitMs),
      );
    }
  }, [exiting, reduced, exitMs]);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Cancel pending finite DOM-removal deadlines when the inbox unmounts.
  useLayoutEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);
  return reduced ? [] : exiting.filter((row) => !allKeys.has(row.key));
}

/**
 * Keeps a disclosure's content mounted while it closes, so a collapse can play before the
 * content leaves the DOM. Reopening mid-close simply reverses; reduced motion unmounts at once.
 */
export function usePresence(open: boolean, exitMs: number = MOTION.exit) {
  const reduced = useMediaQuery(REDUCED_MOTION);
  const [mounted, setMounted] = useState(open);
  // Content open on first render is already there: it must not unfold when the app loads.
  const [initial, setInitial] = useState(open);
  if (!open && initial) setInitial(false);
  if (open && !mounted) setMounted(true);
  if (!open && mounted && reduced) setMounted(false);
  const closing = mounted && !open;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- One finite unmount deadline after the collapse plays.
  useLayoutEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(timer);
  }, [closing, exitMs]);
  return { mounted, closing, initial };
}
