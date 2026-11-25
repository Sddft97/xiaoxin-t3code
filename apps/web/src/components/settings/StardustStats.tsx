import { uiText } from "../../i18n";
import { useUiText } from "../../i18n/useUiText";
import { useEffect } from "react";
import { isElectron } from "../../env";
import { useStardustStats } from "../../state/stardustStats";
import {
  STARDUST_STATS_CHECK_INTERVAL_MS,
  STARDUST_STATS_FIRST_SEND_DELAY_MS,
} from "../../state/stardustStats.logic";
import { Switch } from "../ui/switch";
import { toastManager } from "../ui/toast";
import { SettingsRow } from "./settingsLayout";

/** Shows the one-time notice, then sends at most one anonymous count per day while counting is on. */
export function StardustStatsCoordinator() {
  const enabled = useStardustStats((s) => s.enabled);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Own the one-time notice and the daily count timers while mounted.
  useEffect(() => {
    if (!isElectron || !enabled) return;
    const timers: number[] = [];
    if (!useStardustStats.getState().noticeShown) {
      timers.push(
        window.setTimeout(() => {
          useStardustStats.getState().markNoticeShown();
          const id = toastManager.add({
            type: "info",
            timeout: 30_000,
            title: uiText("Stardust counts active users anonymously"),
            description: uiText(
              "Once a day it sends a random install ID, app version, OS type and CPU architecture. No chats, accounts, projects or IP addresses are stored. You can turn it off any time in Settings → About.",
            ),
            actionProps: {
              children: uiText("Turn off"),
              onClick: () => {
                useStardustStats.getState().setEnabled(false);
                toastManager.close(id);
              },
            },
          });
        }, 8_000),
      );
    }
    timers.push(
      window.setTimeout(() => {
        void useStardustStats.getState().send();
      }, STARDUST_STATS_FIRST_SEND_DELAY_MS + 8_000),
    );
    const interval = window.setInterval(() => {
      void useStardustStats.getState().send();
    }, STARDUST_STATS_CHECK_INTERVAL_MS);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(interval);
    };
  }, [enabled]);
  return null;
}

export function StardustStatsRow() {
  const copy = useUiText();
  const enabled = useStardustStats((s) => s.enabled);
  const setEnabled = useStardustStats((s) => s.setEnabled);
  return (
    <SettingsRow
      title={copy("Count me as an active Stardust user")}
      description={copy(
        "On by default. Sends a random install ID, app version, OS type and CPU architecture to xiaoxin666.cn once a day.",
      )}
      control={
        <Switch
          aria-label={copy("Count me as an active Stardust user")}
          checked={enabled}
          onCheckedChange={(checked) => setEnabled(Boolean(checked))}
        />
      }
    />
  );
}
