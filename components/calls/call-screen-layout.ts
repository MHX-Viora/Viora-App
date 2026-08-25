export const getCallSurfaceLayout = ({
  isDesktopWeb,
}: {
  isDesktopWeb: boolean;
}) =>
  isDesktopWeb
    ? ({ alignSelf: "center", maxWidth: 480, width: "100%" } as const)
    : ({ width: "100%" } as const);
