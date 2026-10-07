import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useLiveReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    // RN Web keys AccessibilityInfo listeners by function text. Multiple live
    // overlays can collide there, leaving an earlier listener after unmount.
    if (Platform.OS === "web") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const changed = (event: MediaQueryListEvent) => setReduced(event.matches);
      setReduced(media.matches);
      media.addEventListener("change", changed);
      return () => media.removeEventListener("change", changed);
    }
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduced;
}
