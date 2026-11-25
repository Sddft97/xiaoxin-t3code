import { useNavigate } from "@tanstack/react-router";
import { readUiLocale, uiText } from "../../i18n";
import { useEffect, useRef } from "react";
import { useEnvironments } from "../../state/environments";
import { toastManager } from "../ui/toast";

export function useMemoryProposalNotification() {
  const { environments } = useEnvironments();
  const navigate = useNavigate();
  const ids = environments.flatMap((environment) =>
    (environment.serverConfig?.settings.memory?.pending ?? []).map(
      ({ id }) => `${environment.environmentId}:${id}`,
    ),
  );
  const key = JSON.stringify(ids);
  const seen = useRef<Set<string> | null>(null);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- settings broadcasts notify the user when a new pending proposal arrives
  useEffect(() => {
    const current = new Set<string>(JSON.parse(key));
    const previous = seen.current;
    if (previous !== null && [...current].some((id) => !previous.has(id))) {
      const id = toastManager.add({
        type: "info",
        title: uiText("New memory proposal to review"),
        description: uiText("Models receive approved memories only."),
        actionProps: {
          children: readUiLocale() === "zh-CN" ? "去审核" : "Review",
          onClick: () => {
            toastManager.close(id);
            void navigate({ to: "/settings/memory" });
          },
        },
        data: {
          secondaryActionProps: {
            children: uiText("Later"),
            onClick: () => toastManager.close(id),
          },
          secondaryActionVariant: "ghost",
        },
      });
    }
    seen.current = current;
  }, [key, navigate]);
}
