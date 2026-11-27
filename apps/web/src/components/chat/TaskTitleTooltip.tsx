import type { ReactElement, RefObject } from "react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function TaskTitleTooltip({
  label,
  textRef,
  trigger,
}: {
  readonly label: string;
  readonly textRef: RefObject<HTMLElement | null>;
  readonly trigger: ReactElement;
}) {
  return (
    <Tooltip
      onOpenChange={(open, event) => {
        const text = textRef.current;
        if (open && (!text || text.scrollWidth <= text.clientWidth)) event.cancel();
      }}
    >
      <TooltipTrigger render={trigger} />
      <TooltipPopup role="tooltip">{label}</TooltipPopup>
    </Tooltip>
  );
}
