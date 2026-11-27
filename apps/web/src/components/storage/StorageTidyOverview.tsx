import type { StorageTidyState, StorageTidyVolume } from "@t3tools/contracts";
import { CheckIcon, HardDriveIcon, ScanLineIcon, ShieldCheckIcon } from "lucide-react";
import { useId } from "react";

import { useUiText } from "~/i18n/useUiText";
import { cn } from "~/lib/utils";
import { formatBytes } from "../../lib/formatBytes";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { Tooltip, TooltipTrigger, TooltipPopup } from "../ui/tooltip";
import {
  capacityFill,
  capacityHint,
  StorageCapacityBar,
  volumeCapacity,
} from "./StorageCapacityBar";
import { usedPercent } from "./storageTidyModel";

export function VolumeCards({
  volumes,
  activePath,
  onSelect,
}: {
  readonly volumes: ReadonlyArray<StorageTidyVolume>;
  readonly activePath: string;
  readonly onSelect: (path: string) => void;
}) {
  const t = useUiText();
  const volumeTips = useId();
  return (
    <div className="flex min-w-0 max-w-full flex-wrap gap-2" role="tablist" aria-label={t("Disks")}>
      {volumes.map((volume, index) => {
        const percent = usedPercent(volume);
        const active = volume.path === activePath;
        return (
          <Tooltip key={volume.path}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  role="tab"
                  aria-describedby={`${volumeTips}-${index}`}
                  aria-selected={active}
                  onClick={() => onSelect(volume.path)}
                  className={cn(
                    "min-w-0 max-w-full rounded-xl border bg-card px-3 py-2 text-left outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    active ? "border-ring/50 bg-accent/60" : "border-border hover:bg-accent/40",
                  )}
                />
              }
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                {active ? (
                  <CheckIcon aria-hidden className="size-3.5 shrink-0 text-info-foreground" />
                ) : (
                  <HardDriveIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{volume.name}</span>
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {volume.internal ? t("Internal") : t("External")}
                {percent !== null && (
                  <span className={percent >= 95 ? "text-destructive-foreground" : undefined}>
                    {" "}
                    · {t("Used {percent}%", { percent })}
                  </span>
                )}
                {` · ${t("{size} free", { size: formatBytes(volume.freeBytes) })}`}
              </span>
            </TooltipTrigger>
            <TooltipPopup role="tooltip" id={`${volumeTips}-${index}`}>
              {volume.path}
            </TooltipPopup>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function StorageTidyOverview({
  state,
  volume,
  scanning,
  disabled,
  onScan,
}: {
  readonly state: StorageTidyState;
  readonly volume: StorageTidyVolume | undefined;
  readonly scanning: boolean;
  readonly disabled: boolean;
  readonly onScan: () => void;
}) {
  const t = useUiText();
  const scanLabelId = useId();
  const durationId = useId();
  if (!volume)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("Disk information is not available yet.")}
      </p>
    );
  const percent = usedPercent(volume);
  const scan = state.scan;
  const capacity = volumeCapacity(volume, scan);
  const label = t("Capacity of {name}", { name: volume.name });
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs/5">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="break-all font-medium text-card-foreground">{volume.name}</span>
              {volume.totalBytes !== null && (
                <span>· {t("{size} total", { size: formatBytes(volume.totalBytes) })}</span>
              )}
              {percent !== null && percent >= 80 ? (
                <Badge variant="warning" size="sm">
                  {t("Used {percent}%", { percent })}
                </Badge>
              ) : null}
            </div>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
              {percent !== null && (
                <strong className="text-xl font-semibold tracking-tight">
                  {t("{used} used", { used: formatBytes(capacity.used) })}
                </strong>
              )}
              <span className="text-sm text-muted-foreground">
                {t("{free} free", { free: formatBytes(volume.freeBytes) })}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {!scanning && (
              <span id={durationId} className="text-xs text-muted-foreground">
                {t("About 30 seconds")}
              </span>
            )}
            <Button
              variant={scan ? "outline" : "default"}
              disabled={disabled || scanning}
              onClick={onScan}
              aria-labelledby={scanning ? scanLabelId : `${scanLabelId} ${durationId}`}
            >
              {scanning ? <Spinner /> : <ScanLineIcon aria-hidden />}
              <span id={scanLabelId}>
                {scanning ? t("Scanning…") : scan ? t("Scan again") : t("Scan")}
              </span>
            </Button>
          </div>
        </div>
        {percent !== null && (
          <StorageCapacityBar
            label={label}
            segments={capacity.segments}
            totalBytes={volume.totalBytes}
            otherUsed={Boolean(scan)}
          />
        )}
        {scan ? (
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-x-3 gap-y-3">
            <CapacityFigure
              total={volume.totalBytes}
              tone="safe"
              label={t("Safe to clean")}
              bytes={capacity.safe}
            />
            <CapacityFigure
              total={volume.totalBytes}
              tone="review"
              label={t("Take a look")}
              bytes={capacity.review}
            />
            <CapacityFigure
              total={volume.totalBytes}
              tone="remind"
              label={t("Remind only")}
              bytes={capacity.remind}
            />
            {percent !== null && (
              <CapacityFigure
                total={volume.totalBytes}
                tone="used"
                label={t("Other used space")}
                bytes={capacity.other}
              />
            )}
            <CapacityFigure
              total={volume.totalBytes}
              tone="free"
              label={t("Free")}
              bytes={volume.freeBytes}
            />
          </dl>
        ) : null}
        {scanning && state.progress.total > 0 ? (
          <progress
            aria-label={t("Scanning…")}
            value={state.progress.checked}
            max={state.progress.total}
            className="block h-1 w-full accent-primary"
          />
        ) : null}
      </div>
      <p className="flex items-start gap-2 border-t border-border/60 bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:px-5">
        <ShieldCheckIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {scan
            ? t("Sizes below were measured by the scan just now. Nothing has been changed yet.")
            : t(
                "Press Scan to start. Scanning only reads; it never changes a file. You choose what to clean afterwards. Before worktrees and build backups are cleaned, screenshots, previews and uncommitted changes are rescued first.",
              )}
        </span>
      </p>
    </section>
  );
}

function CapacityFigure({
  tone,
  label,
  bytes,
  total,
}: {
  readonly tone: "safe" | "review" | "remind" | "used" | "free";
  readonly label: string;
  readonly bytes: number;
  readonly total: number | null;
}) {
  const tipId = useId();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            tabIndex={0}
            aria-describedby={tipId}
            className="min-w-0 w-fit rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          />
        }
      >
        <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-xs forced-colors:forced-color-adjust-none",
              capacityFill[tone],
              tone === "free" && "border border-input",
            )}
          />
          {label}
        </dt>
        <dd
          className={cn(
            "mt-1 tabular-nums",
            tone === "safe" || tone === "review"
              ? "text-base font-semibold"
              : "text-sm text-muted-foreground",
          )}
        >
          {formatBytes(bytes)}
        </dd>
      </TooltipTrigger>
      <TooltipPopup role="tooltip" id={tipId}>
        {capacityHint(label, bytes, total)}
      </TooltipPopup>
    </Tooltip>
  );
}
