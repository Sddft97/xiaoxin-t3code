import { useState } from "react";
import { StardustMark } from "../sidebar/StardustMark";
import softStar from "./stardustHeroT2.svg";

export function StardustHeroMark() {
  const [variant] = useState(() => {
    try {
      // The comparison switch is local to the renderer and takes effect on reload.
      const preview = localStorage.getItem("stardust:dev:hero-mark");
      if (preview === "h1" || preview === "h3") return preview;
    } catch {
      // The default also works when storage is unavailable.
    }
    return "h2";
  });

  return (
    <span
      aria-hidden
      data-stardust-hero-mark={variant}
      className="mb-3 block size-14 text-foreground dark:[--stardust-mark-accent:#6a5af0]"
    >
      {variant === "h3" ? (
        <img alt="" src={softStar} className="size-full" />
      ) : (
        <StardustMark tone={variant === "h1" ? "neutral" : "brand"} className="size-full" />
      )}
    </span>
  );
}
