export const breakpoints = {
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
} as const;

export type Breakpoint = "mobile" | "tablet" | "desktop" | "largeDesktop";

export const getBreakpoint = (width: number): Breakpoint => {
  if (!Number.isFinite(width) || width < breakpoints.tablet) return "mobile";
  if (width < breakpoints.desktop) return "tablet";
  if (width < breakpoints.largeDesktop) return "desktop";
  return "largeDesktop";
};

export const isDesktopWebLayout = ({
  hasMounted,
  isWeb,
  width,
}: {
  hasMounted: boolean;
  isWeb: boolean;
  width: number;
}) => hasMounted && isWeb && width >= breakpoints.desktop;
