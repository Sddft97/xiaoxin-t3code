import type { StorageTidyScan, StorageTidyVolume } from "@t3tools/contracts";

import { formatPercent } from "@t3tools/shared/usageFormat";
import { useUiText } from "~/i18n/useUiText";
import { formatBytes } from "../../lib/formatBytes";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { cn } from "~/lib/utils";
import { itemsByTier, sumBytes } from "./storageTidyModel";

export const capacityFill = {
  safe: "bg-success forced-colors:bg-[Highlight]",
  review: "bg-warning forced-colors:bg-[LinkText]",
  remind: "bg-info forced-colors:bg-[GrayText]",
  used: "bg-muted-foreground/35 contrast-more:bg-muted-foreground/60 forced-colors:bg-[CanvasText]",
  free: "bg-muted forced-colors:bg-[Canvas]",
  released:
    "bg-[repeating-linear-gradient(45deg,var(--success)_0_3px,var(--muted)_3px_6px)] forced-colors:bg-[Highlight]",
  pending:
    "bg-[repeating-linear-gradient(45deg,var(--warning)_0_3px,var(--muted)_3px_6px)] forced-colors:bg-[LinkText]",
} as const;

type CapacitySegment = {
  readonly id: keyof typeof capacityFill;
  readonly value: number;
  readonly measured?: number;
};

export function capacityHint(label: string, bytes: number, total?: number | null) {
  return [label, formatBytes(bytes), total && total > 0 ? formatPercent(bytes / total) : null]
    .filter(Boolean)
    .join(" · ");
}

export function volumeCapacity(volume: StorageTidyVolume, scan: StorageTidyScan | null) {
  const used = Math.max(0, (volume.totalBytes ?? 0) - volume.freeBytes);
  const tiers = itemsByTier(scan);
  const safe = sumBytes(tiers.safe);
  const review = sumBytes(tiers.review);
  const remind = sumBytes(tiers.remind);
  const known = safe + review + remind;
  const other = Math.max(0, used - known);
  // Scan estimates can overlap. Keep the meter within capacity and report measured sizes in the legend.
  const scale = known > used ? used / known : 1;
  const segments: CapacitySegment[] = [
    { id: "safe", value: safe * scale, measured: safe },
    { id: "review", value: review * scale, measured: review },
    { id: "remind", value: remind * scale, measured: remind },
    { id: "used", value: other },
    { id: "free", value: volume.freeBytes },
  ];
  return { safe, review, remind, used, other, segments };
}

export function StorageCapacityBar({
  label,
  segments,
  otherUsed = false,
  totalBytes,
}: {
  readonly otherUsed?: boolean;
  readonly totalBytes?: number | null;
  readonly label?: string;
  readonly segments: ReadonlyArray<CapacitySegment>;
}) {
  const t = useUiText();
  const labels = {
    safe: t("Safe to clean"),
    review: t("Take a look"),
    remind: t("Remind only"),
    used: otherUsed ? t("Other used space") : t("Used"),
    free: t("Free"),
    pending: t("In Trash"),
    released: t("In 7 days"),
  };
  return (
    <div
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      data-testid={label ? "storage-tidy-donut" : undefined}
      className="flex h-3 gap-px overflow-hidden rounded-full border border-border bg-card"
    >
      {segments
        .filter(({ value }) => value > 0)
        .map(({ id, value, measured }) => (
          <Tooltip key={id}>
            <TooltipTrigger
              render={
                <span
                  data-segment={id}
                  className={cn(
                    "min-w-0 basis-0 forced-colors:forced-color-adjust-none",
                    capacityFill[id],
                  )}
                  style={{ flexGrow: value }}
                />
              }
            />
            <TooltipPopup role="tooltip" side="bottom" sideOffset={8}>
              {capacityHint(labels[id], measured ?? value, totalBytes)}
            </TooltipPopup>
          </Tooltip>
        ))}
    </div>
  );
}
