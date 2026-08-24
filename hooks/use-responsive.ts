import { useEffect, useMemo, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

import { getBreakpoint, isDesktopWebLayout } from "@/theme/breakpoints";

export function useResponsive() {
  const { height, width } = useWindowDimensions();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => setHasMounted(true), []);

  return useMemo(() => {
    const breakpoint = getBreakpoint(width);
    const isWeb = Platform.OS === "web";

    return {
      breakpoint,
      height,
      isDesktop: breakpoint === "desktop" || breakpoint === "largeDesktop",
      isDesktopWeb: isDesktopWebLayout({ hasMounted, isWeb, width }),
      isLargeDesktop: breakpoint === "largeDesktop",
      isMobile: breakpoint === "mobile",
      isTablet: breakpoint === "tablet",
      isWeb,
      width,
    };
  }, [hasMounted, height, width]);
}
