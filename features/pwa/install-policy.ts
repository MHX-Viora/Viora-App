export type PwaInstallState =
  | "unavailable"
  | "installable"
  | "installing"
  | "installed";

export type PwaInstallMethod = "prompt" | "ios-manual" | null;
export type PwaSnapshot = {
  installMethod: PwaInstallMethod;
  installState: PwaInstallState;
  isOnline: boolean;
  updateAvailable: boolean;
};
export type PwaInstallResult = "accepted" | "dismissed" | "manual" | "unavailable";
export type PwaUpdateResult = "applied" | "deferred" | "unavailable";

export const isStandaloneDisplay = (
  displayModeStandalone: boolean,
  navigatorStandalone: boolean,
) => displayModeStandalone || navigatorStandalone;

export const isIosSafariInstallCandidate = (
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
) => {
  const isIosDevice =
    /iPad|iPhone|iPod/i.test(platform) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
  const isSafari = /Safari/i.test(userAgent);
  const isAlternativeIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
  return isIosDevice && isSafari && !isAlternativeIosBrowser;
};

export const getInitialInstallState = ({
  isIosSafari,
  isStandalone,
}: {
  isIosSafari: boolean;
  isStandalone: boolean;
}): PwaInstallState => {
  if (isStandalone) return "installed";
  return isIosSafari ? "installable" : "unavailable";
};
