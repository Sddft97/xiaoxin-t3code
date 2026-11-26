import { isMacPlatform } from "@t3tools/shared/keybindings";
import { isElectron } from "~/env";

const platform = typeof navigator === "undefined" ? "" : navigator.platform;
const id = isMacPlatform(platform) ? "mac" : /^win/i.test(platform) ? "windows" : "linux";
const isWindowsDesktop = isElectron && id === "windows";

export const platformProfile = {
  id,
  get platform() {
    return typeof navigator === "undefined" ? platform : navigator.platform;
  },
  modLabel: id === "mac" ? "⌘" : "Ctrl",
  isWindowsDesktop,
  interfaceStyle: isWindowsDesktop ? "windows" : "default",
  windowMaterial: isWindowsDesktop && window.stardustWindowMica ? "mica" : "solid",
} as const;

export function applyPlatformProfile(root: HTMLElement): void {
  root.dataset.platform = platformProfile.id;
  root.dataset.interfaceStyle = platformProfile.interfaceStyle;
  root.dataset.windowMaterial = platformProfile.windowMaterial;
}
