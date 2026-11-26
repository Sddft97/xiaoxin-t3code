import { useId, type SVGProps } from "react";

export function GeminiChipIcon(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  return (
    <svg {...props} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4285F4" />
          <stop offset=".52" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12 1.5C12.8 7.6 16.4 11.2 22.5 12C16.4 12.8 12.8 16.4 12 22.5C11.2 16.4 7.6 12.8 1.5 12C7.6 11.2 11.2 7.6 12 1.5Z"
      />
    </svg>
  );
}

export function GrokChipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11.2" cy="12.8" r="7.1" />
      <path d="M5.6 21.2 20.6 2.8" />
    </svg>
  );
}
