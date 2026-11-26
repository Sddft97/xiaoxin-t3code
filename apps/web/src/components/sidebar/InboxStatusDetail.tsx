import { inboxLabel } from "~/i18n/inboxLabel";
import { derivePendingThreadRequests } from "@t3tools/client-runtime/state/thread-requests";
import { approvalPresentation } from "../../approvalPresentation";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { SidebarThreadSummary } from "../../types";
import type { BoardTask } from "../../taskBoard.logic";
import {
  useQuietThreadProjection,
  useThreadProjection,
  useThreadShell,
} from "../../state/entities";
import { taskProgressSnapshot } from "../../taskProgress";
import { resumeCardDetails, lastRequestSentence } from "../../resumeCard";
import { markdownPlainText } from "../chat/timelineMinimapItems";

export function InboxStatusDetail({
  thread,
  board,
  reason,
  detail,
}: {
  thread: SidebarThreadSummary;
  board: BoardTask | null;
  reason: string;
  detail: string | null;
}) {
  const ref = scopeThreadRef(thread.environmentId, thread.id);
  // oxlint-disable-next-line t3code/no-hardcoded-ui-han -- Internal inbox reason, translated by inboxLabel.
  const hasResult = reason === "有新结果";
  // oxlint-disable-next-line t3code/no-hardcoded-ui-han -- Internal inbox reason, translated by inboxLabel.
  const needsApproval = reason === "待授权";
  // oxlint-disable-next-line t3code/no-hardcoded-ui-han -- Internal inbox reason, translated by inboxLabel.
  const failed = reason === "运行失败";
  const projection = useQuietThreadProjection(hasResult ? null : ref)?.projection ?? null;
  const result = useThreadProjection(hasResult ? ref : null)?.projection;
  const shell = useThreadShell(hasResult ? null : ref);
  const reached = hasResult
    ? null
    : resumeCardDetails(
        { key: "", token: "", ref, title: "", reason },
        taskProgressSnapshot(projection, shell),
        undefined,
        board,
      ).reached;
  const approval =
    projection && needsApproval
      ? derivePendingThreadRequests(projection).approvals.toSorted((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        )[0]
      : undefined;
  const assistant = projection?.messages.findLast((message) => message.role === "assistant")?.text;
  const runId = thread.latestRun?.runId;
  const resultMessage = result?.messages.findLast(
    (message) => message.role === "assistant" && message.runId === runId && message.text,
  );
  const resultItem = result?.visibleTurnItems.findLast(
    ({ item }) => item.type === "assistant_message" && item.runId === runId && item.text,
  )?.item;
  const resultText =
    resultMessage?.text ?? (resultItem?.type === "assistant_message" ? resultItem.text : "");
  const summary = hasResult
    ? markdownPlainText(resultText.slice(0, 280)) || detail
    : board || failed
      ? detail
      : (lastRequestSentence(assistant) ?? detail);
  const description = approval ? approvalPresentation(approval).summary : (reached ?? summary);
  return (
    <span data-sidebar-status-line className="block truncate text-xs text-sidebar-muted-foreground">
      {inboxLabel(reason)}
      {description ? ` · ${description}` : ""}
    </span>
  );
}
