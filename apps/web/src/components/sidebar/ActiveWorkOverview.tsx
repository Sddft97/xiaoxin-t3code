import { InboxQuickActions } from "./InboxQuickActions";
import { inboxLabel } from "~/i18n/inboxLabel";
import { uiText } from "../../i18n";
import { useUiText } from "~/i18n/useUiText";
import { useState } from "react";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { ScopedThreadRef } from "@t3tools/contracts";
import type { SidebarThreadSummary } from "../../types";
import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import {
  activeWorkElapsed,
  activeWorkStatus,
  collectActiveWork,
  activeWorkPreview,
} from "../../sidebarActiveWork";
import { subtaskThreadKey } from "../../sidebarSubtasks";
import { sidebarProviderLabel } from "../../sidebarProviderGrouping";
import { sidebarRelativeTime } from "../../sidebarInboxPresentation";
import { useNowMinute } from "../../hooks/useNowMinute";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { Popover, PopoverTrigger, PopoverPopup, PopoverTitle } from "../ui/popover";

import { cn } from "~/lib/utils";
import { observeSidebarList } from "~/lib/sidebarListMotion";
import { MOTION, useInboxExitRows, withExitingRows } from "~/lib/workbenchMotion";
import { DisclosureChevron, WorkbenchDisclosure } from "./WorkbenchDisclosure";

function activeWorkProjectNames(projects: readonly SidebarProjectSnapshot[]) {
  const result = new Map<string, string>();
  for (const project of projects)
    for (const key of project.providerThreadKeys ?? []) result.set(key, project.displayName);
  return result;
}

export function ActiveWorkOverview({
  threads,
  projects,
  activeKey,
  navigate,
  incomplete = false,
}: {
  threads: readonly SidebarThreadSummary[];
  projects: readonly SidebarProjectSnapshot[];
  activeKey: string | null;
  navigate: (ref: ScopedThreadRef) => void;
  incomplete?: boolean;
}) {
  const text = useUiText();
  const groups = collectActiveWork(threads);
  // The shared minute clock; it only ticks while something subscribes and adds no timer here.
  const nowMs = Date.parse(`${useNowMinute()}:00Z`);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [open, setOpen] = useState(false);
  const projectByThread = activeWorkProjectNames(projects);
  const childCount = groups.reduce((count, group) => count + group.children.length, 0);
  const preview = activeWorkPreview(groups);
  // A task that stops running leaves the sidebar list visibly instead of vanishing.
  const previewRows = preview.map((group, index) => ({
    key: subtaskThreadKey(group.root),
    group,
    index,
  }));
  const leavingGroups = useInboxExitRows(
    previewRows,
    new Set(groups.map((group) => subtaskThreadKey(group.root))),
    (row) =>
      [
        row.index,
        row.group.root.title,
        activeWorkStatus(row.group.root) ?? "",
        row.group.children.map((child) => `${subtaskThreadKey(child)}:${child.title}`).join(","),
      ].join("|"),
    MOTION.exit,
  );
  const sidebarRows = withExitingRows(previewRows, leavingGroups);
  const leavingKeys = new Set(leavingGroups.map((row) => row.key));
  const truncated =
    preview.length < groups.length ||
    preview.some((group, index) => group.children.length < groups[index]!.children.length);
  const go = (thread: SidebarThreadSummary) => {
    navigate(scopeThreadRef(thread.environmentId, thread.id));
    setOpen(false);
  };
  const row = (thread: SidebarThreadSummary, fallback?: string, leaving = false) => {
    const key = subtaskThreadKey(thread);
    const status = activeWorkStatus(thread) ?? fallback;
    const attention = status === "待授权" || status === "待回答";
    const startedAt = thread.runtime?.activityStartedAt ?? null;
    const provider = sidebarProviderLabel(
      thread.runtime?.providerInstanceId ?? thread.modelSelection.instanceId,
    );
    // Second line, as in the mockup: state first, then how long it has been running.
    const detail = [
      status ? inboxLabel(status) : status,
      startedAt ? activeWorkElapsed(startedAt, nowMs) : null,
      provider,
    ]
      .filter(Boolean)
      .join(" · ");
    const tooltip = [provider, projectByThread.get(key), status ? inboxLabel(status) : status]
      .filter(Boolean)
      .join(" · ");
    return (
      <span className="group/inbox-row relative flex min-w-0 flex-1" data-row-actions-host="">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => go(thread)}
                aria-current={activeKey === key ? "page" : undefined}
                data-active-work-row={attention ? "needs-you" : "running"}
                className="min-w-0 flex-1 rounded-md px-1.5 py-1 text-left outline-none hover:bg-accent active:bg-sidebar-row-active focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring aria-[current=page]:bg-accent"
              >
                <span
                  // The title keeps its width; its tail fades under the hover actions.
                  className="workbench-row-fade flex min-w-0 items-center text-xs"
                  data-actions={attention ? "needs-you" : "running"}
                >
                  <span
                    aria-hidden="true"
                    data-sidebar-status-slot
                    className="grid w-3.5 shrink-0 place-items-center"
                  >
                    <span
                      data-active-work-dot
                      className={cn(
                        "size-1.5 rounded-full transition-colors duration-(--motion-hover) ease-standard motion-reduce:transition-none",
                        attention ? "bg-warning" : "bg-sidebar-running-dot",
                      )}
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {thread.title || uiText("Untitled thread")}
                  </span>
                  <span className="workbench-row-time ms-1.5 shrink-0 text-2xs tabular-nums text-sidebar-muted-foreground">
                    {sidebarRelativeTime(thread.runtime?.activityStartedAt ?? thread.updatedAt)}
                  </span>
                </span>
                <span
                  data-sidebar-status-line
                  className="block truncate ps-3.5 text-2xs text-sidebar-muted-foreground"
                >
                  {detail}
                </span>
              </button>
            }
          />
          <TooltipPopup side="right">
            {thread.title || uiText("Untitled thread")}
            <br />
            {tooltip}
          </TooltipPopup>
        </Tooltip>
        {/* A leaving snapshot drops its menus: a portalled menu would outlive the inert row. */}
        {leaving ? null : (
          <InboxQuickActions
            mode={attention ? "needs-you" : "running"}
            threadRef={scopeThreadRef(thread.environmentId, thread.id)}
            title={thread.title}
            onOpen={() => go(thread)}
          />
        )}
      </span>
    );
  };
  const renderGroups = (all: boolean) => (
    <ul
      // The sidebar copy glides as tasks start and finish; the "view all" popover stays still.
      ref={all ? undefined : observeSidebarList}
      aria-label={all ? uiText("All active tasks") : uiText("Active tasks")}
      className="relative space-y-0.5"
    >
      {(all ? groups.map((group) => ({ group })) : sidebarRows).map(({ group }) => {
        const { root, children } = group;
        const key = subtaskThreadKey(root);
        const expanded = all || !collapsed.has(key);
        const leaving = !all && leavingKeys.has(key);
        return (
          <li
            key={key}
            inert={leaving}
            aria-hidden={leaving || undefined}
            data-flip-exiting={leaving ? "" : undefined}
            className={leaving ? "workbench-inbox-exit" : undefined}
          >
            <div className="flex min-w-0 items-center">
              {children.length && !all ? (
                <button
                  type="button"
                  aria-label={uiText("{action} subtasks for {title}", {
                    action: expanded ? uiText("Collapse") : uiText("Expand"),
                    title: root.title,
                  })}
                  aria-expanded={expanded}
                  onClick={() =>
                    setCollapsed((previous) => {
                      const next = new Set(previous);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                  className="shrink-0 rounded p-0.5 text-sidebar-muted-foreground focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <DisclosureChevron open={expanded} />
                </button>
              ) : null}
              {row(
                root,
                children.length
                  ? children.length === 1
                    ? uiText("Waiting for {count} subtask", { count: children.length })
                    : uiText("Waiting for {count} subtasks", { count: children.length })
                  : undefined,
                leaving,
              )}
            </div>
            <WorkbenchDisclosure open={expanded && children.length > 0}>
              <ul
                className="ml-3 border-l border-sidebar-border pl-1"
                aria-label={uiText("{title}’s active subtasks", { title: root.title })}
              >
                {children.map((child) => (
                  <li key={subtaskThreadKey(child)} className="flex min-w-0">
                    {row(child, undefined, leaving)}
                  </li>
                ))}
              </ul>
            </WorkbenchDisclosure>
          </li>
        );
      })}
    </ul>
  );
  return (
    <section
      aria-label={text("Running tasks overview")}
      className="pb-1.5"
      data-sidebar-cap-section=""
    >
      <div
        className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-2xs tracking-wider text-sidebar-muted-foreground"
        data-sidebar-cap=""
      >
        <span>{text("Running")}</span>
        {groups.length === 0 ? (
          <span className="tracking-normal">
            <span aria-hidden>· </span>
            <span>{text("No active tasks")}</span>
          </span>
        ) : childCount ? (
          <span className="tracking-normal">
            {uiText("· Includes {count} subtasks", { count: childCount })}
          </span>
        ) : null}
        <span className="ml-auto tracking-normal tabular-nums">{groups.length}</span>
      </div>
      {incomplete ? (
        <p role="status" className="px-2 text-3xs text-sidebar-muted-foreground">
          {uiText("Connection pending. Some statuses may be out of date.")}
        </p>
      ) : null}
      {groups.length === 0 && leavingGroups.length === 0 ? null : renderGroups(false)}
      {truncated ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<Button variant="ghost" size="xs" />}>
            {uiText("View all {count} items", { count: groups.length + childCount })}
          </PopoverTrigger>
          <PopoverPopup side="right" align="start" width="lg" padding="compact">
            <PopoverTitle>
              {uiText("In progress · {main} main tasks, {subtasks} subtasks", {
                main: groups.length,
                subtasks: childCount,
              })}
            </PopoverTitle>
            <div className="mt-2 max-h-[min(65vh,640px)] overflow-y-auto">{renderGroups(true)}</div>
          </PopoverPopup>
        </Popover>
      ) : null}
    </section>
  );
}
