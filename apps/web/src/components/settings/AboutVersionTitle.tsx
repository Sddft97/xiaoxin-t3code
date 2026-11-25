import { STARDUST_WINDOWS_BRAND } from "@t3tools/shared/stardustWindowsBrand";
import { platformProfile } from "~/lib/PlatformProfile";
import { msg, T, useGT } from "gt-react";

import { useUiText } from "../../i18n/useUiText";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { InlineButton } from "../ui/button";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function AboutVersionTitle({ version }: { version: string }) {
  const gt = useGT();
  const uiText = useUiText();
  const { copyToClipboard } = useCopyToClipboard<void>({
    target: {
      target: "version",
      unavailableMessage: msg("Clipboard API is unavailable while copying version."),
      failureMessage: msg("Failed to copy version to the clipboard."),
    },
    onError: (error) => {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: gt("Could not copy version"),
          description: error.message,
        }),
      );
    },
  });

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <InlineButton
            tone="muted"
            aria-label={gt("Copy version {version}", { version })}
            onClick={() => copyToClipboard(version, undefined)}
          >
            {platformProfile.isWindowsDesktop
              ? `${STARDUST_WINDOWS_BRAND.description} ${version}`
              : uiText("Stardust {version}", { version })}
          </InlineButton>
        }
      />
      <TooltipPopup>
        <T>Copy version</T>
      </TooltipPopup>
    </Tooltip>
  );
}
