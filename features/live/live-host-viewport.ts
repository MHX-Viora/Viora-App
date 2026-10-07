import { Platform } from "react-native";

export function isHostMobileViewport(width: number, height: number) {
  if (width <= 767 || (height <= 500 && width <= 950)) return true;
  if (Platform.OS !== "web" || typeof window === "undefined") return false;

  const handset = /Android.*Mobile|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);
  const physicalWidth = window.innerWidth * window.devicePixelRatio;
  return handset || physicalWidth <= 767;
}
