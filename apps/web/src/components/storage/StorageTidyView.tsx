import type {
  StorageTidyOperation,
  StorageTidySettings,
  StorageTidyState,
  StorageTidyVolume,
} from "@t3tools/contracts";

import { useUiText } from "~/i18n/useUiText";
import { formatBytes } from "../../lib/formatBytes";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { StorageCapacityBar, volumeCapacity } from "./StorageCapacityBar";
import { StorageTidyDone } from "./StorageTidyDone";
import { StorageTidyOverview, VolumeCards } from "./StorageTidyOverview";
import { SettingsPageContainer } from "../settings/settingsLayout";
import { TooltipScrollDismissArea } from "../ui/tooltip";
import { ActionBar, StorageTidyNotes, StorageTidyResults } from "./StorageTidyResults";
import { StorageTidySettingsSection } from "./StorageTidySettings";
import type { Translate } from "./storageTidyCopy";
import { recoveryDaysLeft, selectionSummary } from "./storageTidyModel";

export type StorageTidyViewMode = "start" | "scanning" | "result" | "executing" | "done";

export type StorageTidyViewProps = {
  readonly state: StorageTidyState;
  readonly mode: StorageTidyViewMode;
  readonly activeVolumePath: string;
  readonly selected: ReadonlySet<string>;
  readonly rescueEnabled: boolean;
  readonly canWrite: boolean;
  readonly busy: boolean;
  readonly nowMs: number;
  readonly error: string | null;
  readonly settingsError: string | null;
  readonly onVolumeChange: (path: string) => void;
  readonly onToggle: (id: string, checked: boolean) => void;
  readonly onToggleMany: (ids: ReadonlyArray<string>, checked: boolean) => void;
  readonly onRescueChange: (enabled: boolean) => void;
  readonly onScan: () => void;
  readonly onExecute: () => void;
  readonly onUndo: (operation: StorageTidyOperation) => void;
  readonly onOpenArchive: (operation: StorageTidyOperation) => void;
  readonly onFinish: () => void;
  readonly onCopyMoleInstall: () => void;
  readonly onSettingsChange: (patch: Partial<StorageTidySettings>) => void;
};

function LastRunStrip({
  operation,
  nowMs,
  busy,
  onUndo,
}: {
  readonly operation: StorageTidyOperation;
  readonly nowMs: number;
  readonly busy: boolean;
  readonly onUndo: () => void;
}) {
  const t = useUiText();
  const days = recoveryDaysLeft(operation.recoverableUntil, nowMs);
  if (
    operation.phase !== "completed" ||
    operation.undone ||
    operation.purged ||
    days === null ||
    days <= 0 ||
    operation.trashedBytes === 0
  )
    return null;
  return (
    <section
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-5 py-3.5 shadow-xs/5"
      data-testid="last-run"
    >
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium">
          {t("Last cleanup: {size} is still in Trash", {
            size: formatBytes(operation.trashedBytes),
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("You can undo it for {days} more days. After that this app empties its Trash batch.", {
            days,
          })}
        </div>
      </div>
      <Button variant="outline" size="sm" disabled={busy} onClick={onUndo}>
        {t("Undo what went to Trash")}
      </Button>
    </section>
  );
}

export function StorageTidyView(props: StorageTidyViewProps) {
  const t = useUiText();
  const { state, mode } = props;
  const volume: StorageTidyVolume | undefined =
    state.volumes.find((row) => row.path === props.activeVolumePath) ?? state.volumes[0];
  const dateLabel = new Date(props.nowMs).toLocaleDateString("sv-SE");
  const operation = state.operation;
  const summary =
    mode === "result" && state.scan
      ? selectionSummary(state.scan.items, props.selected, volume)
      : null;
  return (
    <TooltipScrollDismissArea
      className="flex min-h-0 flex-1 flex-col"
      data-testid="storage-tidy"
      data-mode={mode}
    >
      <SettingsPageContainer width="wide">
        <div className="mx-auto w-full max-w-[920px] space-y-6 pb-4">
          <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0 max-w-md">
              <h1 className="text-2xl font-semibold tracking-tight">{t("Storage & cleanup")}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t(
                  "See what is taking up the disk first, then clean only what can be safely recovered or rebuilt.",
                )}
              </p>
            </div>
            {state.volumes.length > 0 ? (
              <VolumeCards
                volumes={state.volumes}
                activePath={volume?.path ?? ""}
                onSelect={props.onVolumeChange}
              />
            ) : null}
          </header>

          {props.error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive-foreground"
            >
              {props.error}
            </p>
          ) : null}

          {mode === "start" || mode === "scanning" ? (
            <>
              <StorageTidyOverview
                state={state}
                volume={volume}
                scanning={mode === "scanning"}
                disabled={!props.canWrite || props.busy}
                onScan={props.onScan}
              />
              {mode === "scanning" ? (
                <p className="text-sm text-muted-foreground" role="status" data-testid="scan-step">
                  {t("Checked {checked} of {total} places", {
                    checked: state.progress.checked,
                    total: state.progress.total,
                  })}
                  {" · "}
                  {scanStepLabel(t, state.progress.step)}
                </p>
              ) : null}
              {mode === "start" && operation ? (
                <LastRunStrip
                  operation={operation}
                  nowMs={props.nowMs}
                  busy={props.busy}
                  onUndo={() => props.onUndo(operation)}
                />
              ) : null}
            </>
          ) : null}

          {mode === "executing" ? (
            <div
              className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs/5"
              data-testid="tidy-executing"
            >
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-base font-semibold">
                  <Spinner size="md" />
                  {t("Cleaning…")}
                </p>
                <p className="text-sm text-muted-foreground" role="status">
                  {state.operation?.phase === "running" && state.operation.progress
                    ? t("{done} of {total} items", {
                        done: state.operation.progress.done,
                        total: state.operation.progress.total,
                      })
                    : t("Starting…")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Keep this page open. Items are re-checked one by one right before they are touched.",
                  )}
                </p>
              </div>
              <StorageCapacityBar
                label={t("Cleaning…")}
                otherUsed={Boolean(state.scan)}
                totalBytes={volume?.totalBytes ?? null}
                segments={volume ? volumeCapacity(volume, state.scan).segments : []}
              />
            </div>
          ) : null}

          {mode === "result" && summary ? (
            <>
              <StorageTidyOverview
                state={state}
                volume={volume}
                scanning={false}
                disabled={!props.canWrite || props.busy}
                onScan={props.onScan}
              />
              <StorageTidyResults
                state={state}
                summary={summary}
                selected={props.selected}
                rescueEnabled={props.rescueEnabled}
                nowMs={props.nowMs}
                dateLabel={dateLabel}
                onToggle={props.onToggle}
                onToggleMany={props.onToggleMany}
                onRescueChange={props.onRescueChange}
                onCopyMoleInstall={props.onCopyMoleInstall}
                settingsHint={
                  <p className="px-1 text-xs text-muted-foreground" data-testid="build-folder-hint">
                    {t(
                      "Set My build folder in the preferences below to include older builds and rollback copies.",
                    )}
                  </p>
                }
              />
            </>
          ) : null}

          {mode === "done" && operation ? (
            <StorageTidyDone
              operation={operation}
              volume={volume}
              nowMs={props.nowMs}
              busy={props.busy}
              onUndo={() => props.onUndo(operation)}
              onOpenArchive={() => props.onOpenArchive(operation)}
              onFinish={props.onFinish}
            />
          ) : null}

          {mode === "start" ? <StorageTidyNotes /> : null}
          {mode === "start" || mode === "result" ? (
            <StorageTidySettingsSection
              settings={state.settings}
              rescueRoot={state.rescueRoot}
              disabled={!props.canWrite || props.busy}
              error={props.settingsError}
              onChange={props.onSettingsChange}
            />
          ) : null}
        </div>
      </SettingsPageContainer>
      {summary && (
        <ActionBar
          summary={summary}
          rescueEnabled={props.rescueEnabled}
          busy={props.busy || !props.canWrite}
          onExecute={props.onExecute}
          onRescan={props.onScan}
        />
      )}
    </TooltipScrollDismissArea>
  );
}

function scanStepLabel(t: Translate, step: string): string {
  switch (step) {
    case "devcache":
      return t("Developer caches");
    case "worktrees":
      return t("Agent worktrees");
    case "sessions":
      return t("AI session transcripts");
    case "tmp":
      return t("Agent temporary folders");
    case "backups":
      return t("Rollback copies and build backups");
    case "t3data":
      return t("Stardust data");
    case "mole":
      return t("System and app caches (Mole rules)");
    default:
      return t("Starting…");
  }
}
