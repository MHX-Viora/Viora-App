import type {
  PwaInstallResult,
  PwaSnapshot,
  PwaUpdateResult,
} from "@/features/pwa/install-policy";

const snapshot: PwaSnapshot = {
  installMethod: null,
  installState: "unavailable",
  isOnline: true,
  updateAvailable: false,
};

export const getPwaSnapshot = () => snapshot;
export const subscribePwa = () => () => undefined;
export const initializePwa = () => undefined;
export const requestPwaInstall = async (): Promise<PwaInstallResult> => "unavailable";
export const applyPwaUpdate = async (): Promise<PwaUpdateResult> => "unavailable";
