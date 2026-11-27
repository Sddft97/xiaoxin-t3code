import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { useUiText } from "~/i18n/useUiText";
import { useRenderedAppearance } from "../../hooks/useTheme";
import { StardustMark } from "../sidebar/StardustMark";
import type { CosmicEffortOption } from "./CosmicEffortSlider";
import {
  GALAXY_EFFORT_LABELS,
  galaxyEffortStops,
  namedGalaxyEffortLevel,
} from "./galaxyEffortLevels";
import { GalaxyEffortFace } from "./GalaxyEffortFace";
import { effortThumbInset as thumbInset, mountEffortMotion } from "./galaxyEffortMotion";
import "./galaxyEffort.css";

export function GalaxyEffortSlider({
  options,
  value,
  disabled,
  onChange,
}: {
  options: readonly CosmicEffortOption[];
  value: string | undefined;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const ui = useUiText();
  const appearance = useRenderedAppearance();
  const foundIndex = options.findIndex((option) => option.id === value);
  const index = Math.max(
    0,
    foundIndex < 0 ? options.findIndex((option) => option.isDefault) : foundIndex,
  );
  const choice = options[index];
  const stops = galaxyEffortStops(options);
  const level = stops[index] ?? 0;
  const namedLevel = namedGalaxyEffortLevel(choice?.id);
  const text = choice
    ? ui(namedLevel === undefined ? choice.label : GALAXY_EFFORT_LABELS[namedLevel]!)
    : "";
  const label = ui("Reasoning effort");
  const host = useRef<HTMLDivElement>(null);
  const burst = useRef<HTMLSpanElement>(null);
  const previousChoice = useRef(choice?.id);
  const position = options.length > 5 ? index / (options.length - 1) : level / 4;

  const initialPosition = useRef(position);
  const motion = useRef<ReturnType<typeof mountEffortMotion> | null>(null);
  const dragBounds = useRef<DOMRect | null>(null);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- connect the decorative canvas and SVG to the popup lifecycle
  useEffect(() => {
    if (!host.current) return;
    const scene = mountEffortMotion(host.current, initialPosition.current);
    motion.current = scene;
    return () => {
      scene.dispose();
      motion.current = null;
    };
  }, []);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- sync external selection and appearance to the imperative scene
  useEffect(() => {
    motion.current?.setAppearance(appearance === "light");
    if (!dragBounds.current) motion.current?.move(position, false);
  }, [position, appearance]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- play a single glint when the selected option changes
  useEffect(() => {
    const changed = previousChoice.current !== choice?.id;
    previousChoice.current = choice?.id;
    if (
      !changed ||
      !host.current?.hasAttribute("data-awake") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const glint = burst.current?.animate(
      [
        { opacity: 0, transform: "scale(.64)" },
        { opacity: 1, offset: 0.28 },
        { opacity: 0, transform: "scale(1.18)" },
      ],
      { duration: 360, easing: "ease-out" },
    );
    return () => glint?.cancel();
  }, [choice?.id]);

  function select(next: number) {
    const option = options[Math.min(options.length - 1, Math.max(0, next))];
    if (option && option.id !== value) onChange(option.id);
  }

  function move(event: PointerEvent<HTMLDivElement>, follow: boolean) {
    const rect = dragBounds.current;
    if (!rect) return;
    const pointerRatio =
      (event.clientX - rect.left - thumbInset) / Math.max(1, rect.width - 2 * thumbInset);
    const ratio = Math.min((stops.at(-1) ?? 4) / 4, Math.max((stops[0] ?? 0) / 4, pointerRatio));
    const target = 4 * ratio;
    motion.current?.move(ratio, true, follow);
    const next =
      options.length > 5
        ? Math.round(ratio * (options.length - 1))
        : stops.reduce(
            (nearest, stop, i) =>
              Math.abs(stop - target) < Math.abs(stops[nearest]! - target) ? i : nearest,
            index,
          );
    select(next);
  }

  return (
    <div
      className="gx"
      data-mode={appearance}
      data-lv={level}
      ref={host}
      onPointerEnter={() => motion.current?.wake()}
      onPointerMove={() => motion.current?.wake()}
      onFocus={() => motion.current?.wake()}
    >
      <div className="gx-row">
        <span className="gx-t">
          <StardustMark className="gx-ico" />
          {label}
        </span>
        <div
          className="gx-stage"
          style={
            {
              "--gx-stop": position,
              "--gx-level": level,
              "--gx-inset": `${thumbInset}px`,
            } as CSSProperties
          }
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-disabled={disabled || undefined}
          aria-valuemin={0}
          aria-valuemax={options.length - 1}
          aria-valuenow={index}
          aria-valuetext={text}
          data-effort-row
          data-effort-slider
          onKeyDown={(event) => {
            if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
            const next =
              event.key === "ArrowRight" || event.key === "ArrowUp"
                ? index + 1
                : event.key === "ArrowLeft" || event.key === "ArrowDown"
                  ? index - 1
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? options.length - 1
                      : null;
            if (next === null) return;
            event.preventDefault();
            event.stopPropagation();
            select(next);
          }}
          onPointerDown={(event) => {
            if (disabled || !event.isPrimary || event.button !== 0) return;
            event.currentTarget.focus({ preventScroll: true });
            dragBounds.current = event.currentTarget.getBoundingClientRect();
            event.currentTarget.dataset.dragging = "";
            event.currentTarget.setPointerCapture(event.pointerId);
            move(event, false);
          }}
          onPointerMove={(event) => {
            if (!disabled && event.currentTarget.hasPointerCapture(event.pointerId))
              move(event, true);
          }}
          onLostPointerCapture={(event) => {
            delete event.currentTarget.dataset.dragging;
            dragBounds.current = null;
            motion.current?.move(position, false);
          }}
        >
          <div className="gx-ch" aria-hidden />
          <div className="gx-fill" aria-hidden />
          <canvas className="gx-sky" aria-hidden />
          <div className="gx-thumb" aria-hidden>
            <div className="gx-mascot">
              <GalaxyEffortFace />
            </div>
            <span className="gx-burst" ref={burst} />
          </div>
        </div>
        <b className="gx-v">{text}</b>
      </div>
    </div>
  );
}
