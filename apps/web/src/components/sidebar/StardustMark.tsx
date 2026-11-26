import { useId } from "react";

export const STARDUST_STAR_PATH =
  "M475.4 324.7Q512 265 548.6 324.7L581.3 378Q600.2 408.6 635.2 417.1L696 431.7Q764 448.1 718.6 501.4L678 549Q654.7 576.4 657.5 612.2L662.3 674.6Q667.8 744.4 603.1 717.6L545.3 693.8Q512 680 478.7 693.8L420.9 717.6Q356.2 744.4 361.7 674.6L366.5 612.2Q369.3 576.4 346 549L305.4 501.4Q260 448.1 328 431.7L388.8 417.1Q423.8 408.6 442.7 378Z";

const STARDUST_EYE_PATH =
  "M468 462a22 22 0 0 1 22 22v44a22 22 0 0 1-44 0v-44a22 22 0 0 1 22-22ZM558 462a22 22 0 0 1 22 22v44a22 22 0 0 1-44 0v-44a22 22 0 0 1 22-22Z";

export function StardustMark({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: "neutral" | "brand";
}) {
  const id = useId();
  return (
    <svg
      aria-hidden
      data-stardust-mark
      viewBox="250 258 524 492"
      className={className}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-tint`} x1=".15" y1=".05" x2=".9" y2="1">
          <stop offset="0" stopColor="currentColor" />
          <stop offset=".5" stopColor="currentColor" />
          <stop
            offset="1"
            stopColor="var(--stardust-accent, var(--stardust-mark-accent, #5b4be0))"
          />
        </linearGradient>
      </defs>
      <path
        d={STARDUST_STAR_PATH + STARDUST_EYE_PATH}
        fillRule="evenodd"
        fill={tone === "brand" ? `url(#${id}-tint)` : "currentColor"}
      />
    </svg>
  );
}
