// @effect-diagnostics nodeBuiltinImport:off -- Electron's DWM backdrop requires the Windows kernel build.
import * as NodeOS from "node:os";

export const WINDOWS_MICA_ARGUMENT = "--stardust-window-mica";

export function supportsWindowsMica(platform: NodeJS.Platform, release: string): boolean {
  return platform === "win32" && Number(release.split(".")[2]) >= 22621;
}

export const windowsMicaSupported = (platform: NodeJS.Platform): boolean =>
  platform === "win32" && supportsWindowsMica(platform, NodeOS.release());
