import type { LimitPoolWindow } from "@t3tools/shared/usageLimits";
import { formatDuration } from "@t3tools/shared/usageLimitsCopy";
import { T, Var, useMessages } from "gt-react";
import type { ReactNode } from "react";

export function QuotaNextRefill({
  window,
  now,
  fallback,
}: {
  readonly window: LimitPoolWindow | undefined;
  readonly now: number;
  readonly fallback?: ReactNode;
}) {
  const messages = useMessages();
  const refill = window?.resets.find((reset) => reset.at > now && reset.restoresPercent > 0);
  if (!window || window.columns.length < 2 || !refill) return fallback;
  return (
    <time dateTime={new Date(refill.at).toISOString()}>
      <T context="usage limit refill">
        <span className="font-medium text-foreground">
          ↻ +<Var>{refill.restoresPercent}</Var>%
        </span>{" "}
        in <Var>{formatDuration(refill.at - now, messages)}</Var>
      </T>
    </time>
  );
}
