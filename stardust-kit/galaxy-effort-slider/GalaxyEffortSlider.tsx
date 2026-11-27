import { useEffect, useRef, type PointerEvent } from "react";
import { useUiText } from "~/i18n/useUiText";
import { useRenderedAppearance } from "../../hooks/useTheme";
import { StardustMark } from "../sidebar/StardustMark";
import type { CosmicEffortOption } from "./CosmicEffortSlider";
import { GalaxyEffortCanvas } from "./galaxyEffortCanvas";
import {
  GALAXY_EFFORT_LABELS,
  galaxyEffortStops,
  namedGalaxyEffortLevel,
} from "./galaxyEffortLevels";
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
  const engine = useRef<GalaxyEffortCanvas | null>(null);
  const initialLevel = useRef(level);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- attach the r5 canvas to the mounted model popup
  useEffect(() => {
    if (!host.current) return;
    const renderer = new GalaxyEffortCanvas(host.current, initialLevel.current);
    engine.current = renderer;
    return () => {
      engine.current = null;
      renderer.destroy();
    };
  }, [appearance]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- update the canvas on keyboard, pointer or saved effort changes
  useEffect(() => {
    initialLevel.current = level;
    engine.current?.setValue(level);
  }, [appearance, level]);

  function select(next: number) {
    const option = options[Math.min(options.length - 1, Math.max(0, next))];
    if (option && option.id !== value) onChange(option.id);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const inset = 22.2;
    const target = 4 * ((event.clientX - rect.left - inset) / (rect.width - 2 * inset));
    const next =
      options.length > 5
        ? Math.round((target / 4) * (options.length - 1))
        : stops.reduce(
            (nearest, stop, i) =>
              Math.abs(stop - target) < Math.abs(stops[nearest]! - target) ? i : nearest,
            index,
          );
    select(next);
  }

  return (
    <div className="gx" data-mode={appearance} data-lv={level} ref={host}>
      <div className="gx-row">
        <span className="gx-t">
          <StardustMark className="gx-ico" />
          {label}
        </span>
        <div
          className="gx-stage"
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
            engine.current?.wake();
            select(next);
          }}
          onPointerEnter={() => {
            if (!disabled) engine.current?.wake();
          }}
          onPointerDown={(event) => {
            if (disabled || event.button !== 0) return;
            engine.current?.wake();
            event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            move(event);
          }}
          onPointerMove={(event) => {
            if (disabled) return;
            engine.current?.wake();
            if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event);
          }}
        >
          <div className="gx-ch" aria-hidden>
            <i className="gx-nb nb1" data-an="aur" />
            <i className="gx-nb nb2" data-an="aur" />
            {[1, 2, 3, 4, 5].map((i) => (
              <i key={i} className={`gx-sf sf${i}`} data-an="star" />
            ))}
            <div className="gx-auw">
              <i className="gx-aur au1" data-an="aur" />
              <i className="gx-aur au2" data-an="aur" />
            </div>
            <div className="gx-rimw">
              <i className="gx-rim" data-an="rim" />
            </div>
          </div>
          <canvas aria-hidden />
        </div>
        <b className="gx-v">{text}</b>
      </div>
    </div>
  );
}
