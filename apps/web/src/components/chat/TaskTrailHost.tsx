import type { ComponentProps } from "react";
import { ThreadTaskTrail } from "./ThreadTaskTrail";

export function TaskTrailHost(props: Omit<ComponentProps<typeof ThreadTaskTrail>, "decision">) {
  // Pending structured questions render exclusively in ComposerPendingUserInputPanel above the
  // composer; duplicating them inside the floating TaskPlanCapsule causes two identical forms.
  return <ThreadTaskTrail {...props} />;
}
