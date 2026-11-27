// Script-side mirror of tokens.css (MIT, Stardust project). Use for WAAPI / JS-driven animation so CSS stays the source of truth.
export const MOTION = {
  press: { duration: 80, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
  hover: { duration: 120, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
  swap: { duration: 160, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
  exit: { duration: 180, easing: "cubic-bezier(0.4, 0, 0.85, 0.6)" },
  enter: { duration: 220, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
  expand: { duration: 240, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
  pop: { duration: 240, easing: "cubic-bezier(0.22, 1.16, 0.36, 1)" },
} as const;

export type MotionToken = keyof typeof MOTION;

/** Honour the user's setting; call once per animation. */
export const prefersReducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Read the review multiplier from CSS so slow-motion review also slows script-driven animation. */
const scale = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--motion-scale")) || 1;

/** Animate with a token. Cancels nothing; the browser continues from the current value when you pass `composite: "replace"` keyframes without a fixed `from`. */
export function animateWith(
  el: Element,
  token: MotionToken,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
) {
  const { duration, easing } = MOTION[token];
  return el.animate(keyframes, {
    duration: prefersReducedMotion() ? 0 : duration * scale(),
    easing,
    fill: "both",
  });
}
