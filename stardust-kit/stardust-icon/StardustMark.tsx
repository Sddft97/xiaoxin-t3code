/* oxlint-disable shadcn/no-raw-colors -- fixed brand artwork, identical in light and dark */
/**
 * The T2 "星宝" brand mark, simplified for 16-24px: a night-violet tile, a soft white star with
 * two pill eyes and an orbiting ring that passes behind and in front of it. Flat fills only (no
 * blur filters or gradients), static, so it costs nothing to paint and never repaints on its own.
 */
const STAR_PATH =
  "M475.4 324.7Q512 265 548.6 324.7L581.3 378Q600.2 408.6 635.2 417.1L696 431.7Q764 448.1 718.6 501.4L678 549Q654.7 576.4 657.5 612.2L662.3 674.6Q667.8 744.4 603.1 717.6L545.3 693.8Q512 680 478.7 693.8L420.9 717.6Q356.2 744.4 361.7 674.6L366.5 612.2Q369.3 576.4 346 549L305.4 501.4Q260 448.1 328 431.7L388.8 417.1Q423.8 408.6 442.7 378Z";

export function StardustMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-stardust-mark=""
      viewBox="100 100 824 824"
      className={className}
      focusable="false"
    >
      <rect x="100" y="100" width="824" height="824" rx="186" fill="#17143a" />
      {/* Orbit, back half: behind the star. */}
      <ellipse
        cx="512"
        cy="548"
        rx="340"
        ry="100"
        transform="rotate(-14 512 548)"
        fill="none"
        stroke="#d8ccff"
        strokeOpacity=".4"
        strokeWidth="34"
      />
      <path
        d={STAR_PATH}
        fill="#c9bfff"
        opacity=".55"
        transform="translate(512 548) scale(1.1) translate(-512 -548)"
      />
      <path d={STAR_PATH} fill="#f4f1ff" />
      <rect x="440" y="456" width="52" height="100" rx="26" fill="#2f3cc4" />
      <rect x="534" y="456" width="52" height="100" rx="26" fill="#2f3cc4" />
      {/* Orbit, front half: in front of the star's lower part. */}
      <path
        d="M841.9 465.8A340 100 -14 0 1 182.1 630.2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="30"
        strokeLinecap="round"
      />
    </svg>
  );
}
