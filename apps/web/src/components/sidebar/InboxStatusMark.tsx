import { inboxLabel } from "~/i18n/inboxLabel";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import type { inboxReason } from "../../workbenchInbox";

export function InboxStatusMark({
  reason,
  compact = false,
}: {
  reason: NonNullable<ReturnType<typeof inboxReason>>;
  compact?: boolean;
}) {
  const failed = reason === "运行失败";
  const hasResult = reason === "有新结果";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="img"
            aria-label={inboxLabel(reason)}
            className={
              compact
                ? `block size-1.5 rounded-full ${failed ? "bg-destructive" : hasResult ? "bg-success" : "bg-warning"}`
                : `inline-flex w-2 shrink-0 items-center justify-center text-xs ${failed ? "text-destructive" : hasResult ? "text-muted-foreground" : "text-primary"}`
            }
          >
            {compact ? null : failed ? "▲" : hasResult ? "○" : "●"}
          </span>
        }
      />
      <TooltipPopup side="right">{inboxLabel(reason)}</TooltipPopup>
    </Tooltip>
  );
}
