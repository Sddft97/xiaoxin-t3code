/* oxlint-disable shadcn/no-unknown-classes -- Slider artwork is styled by galaxyEffort.css. */
import { useId } from "react";
import { StardustMark } from "../sidebar/StardustMark";

// Coordinates are in the brand mark's native viewBox. Keep one set of features
// mounted so a reversal midway through a smile bends the same shapes back.
export function GalaxyEffortFace() {
  const blush = useId();
  return (
    <StardustMark className="gx-star">
      <defs>
        <radialGradient id={blush}>
          <stop stopColor="var(--gx-cheek)" />
          <stop offset=".52" stopColor="var(--gx-cheek)" stopOpacity=".86" />
          <stop offset="1" stopColor="var(--gx-cheek)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(512 514)">
        <g fill={`url(#${blush})`} data-cheeks="">
          <ellipse cx="-99" cy="34" rx="31" ry="18" />
          <ellipse cx="99" cy="34" rx="31" ry="18" />
        </g>
        {[-1, 1].map((side) => (
          <g key={side} transform={`translate(${side * 54} -13) scale(${-side} 1)`}>
            <g>
              <g data-eye="">
                <path fill="var(--gx-pupil)" />
                <ellipse fill="var(--gx-catchlight)" />
                <path
                  d="M-9 -31Q-8 -17 4 -15Q-8 -14 -9 0Q-10 -14 -22 -15Q-10 -17 -9 -31Z"
                  fill="var(--gx-catchlight)"
                />
              </g>
            </g>
          </g>
        ))}
        <path
          data-mouth=""
          fill="none"
          stroke="var(--gx-mouth)"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </g>
    </StardustMark>
  );
}

// Half-height, upper eyelid tilt, pupil width, catchlight, mouth width and
// curve, blush, extra glint, and lower eyelid lift. Each column follows a continuous pose curve.
const poses = [
  [8, -3, 23, 0.8, 13, 4, 0.2, 0, 0],
  [32, 0, 20, 5, 17, 13, 0.32, 0, 0],
  [27, 0, 24, 5, 21, 18, 0.39, 0, 40],
  [35, 4, 24, 7, 22, 19, 0.57, 0.66, 0],
  [42, -2, 27, 8, 25, 30, 0.8, 1, 0],
] as const;

export function bindEffortFace(host: HTMLElement) {
  const eyes = [...host.querySelectorAll<SVGGElement>("[data-eye]")];
  const mouth = host.querySelector("[data-mouth]")!;
  const cheeks = host.querySelector("[data-cheeks]")!;
  return (ratio: number) => {
    const level = Math.min(4, Math.max(0, ratio * 4));
    const i = Math.min(3, Math.floor(level));
    const t = level - i;
    const blend = t * t * (3 - 2 * t);
    const mix = (n: number) => poses[i]![n]! + (poses[i + 1]![n]! - poses[i]![n]!) * blend;
    const h = mix(0),
      lid = mix(1),
      w = mix(2),
      light = mix(3);
    const sparkle = mix(7);
    const lowerLid = h * 1.4 - mix(8);
    const eye = `M${-w} 0Q${-w} ${-h - lid} ${-w * 0.48} ${-h - lid * 0.6}Q${w} ${-h + lid} ${w} 0C${w} ${lowerLid} ${-w} ${lowerLid} ${-w} 0Z`;
    for (const group of eyes) {
      const [pupil, highlight, glint] = group.children;
      const gaze = `translate(${lid * 0.24} ${-h * 0.08})`;
      group.parentElement!.setAttribute("transform", gaze);
      pupil!.setAttribute("d", eye);
      highlight!.setAttribute("cx", String(-w * 0.25 + lid * 0.3 + sparkle * 17));
      highlight!.setAttribute("cy", String(-h * 0.35 + sparkle * 26));
      highlight!.setAttribute("rx", String(light));
      highlight!.setAttribute("ry", String(light * 0.88));
      glint!.setAttribute("opacity", String(sparkle));
    }
    mouth.setAttribute("d", `M${-mix(4)} 44Q0 ${44 + mix(5)} ${mix(4)} 44`);
    cheeks.setAttribute("opacity", String(mix(6)));
  };
}
