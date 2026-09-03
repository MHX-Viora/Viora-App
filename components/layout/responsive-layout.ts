export const getResponsiveContentLayout = ({
  isDesktopWeb,
  maxWidth,
}: {
  isDesktopWeb: boolean;
  maxWidth: number;
}) =>
  isDesktopWeb
    ? ({ alignSelf: "center", maxWidth, width: "100%" } as const)
    : ({ width: "100%" } as const);

export const getReelContentWidth = ({
  height,
  maxWidth,
}: {
  height: number;
  maxWidth: number;
}) =>
  Number.isFinite(height) && height > 0
    ? Math.min(maxWidth, Math.round((height * 21) / 32))
    : maxWidth;

export const getResponsiveBottomPadding = ({
  desktopPadding,
  isDesktopWeb,
  mobilePadding,
}: {
  desktopPadding: number;
  isDesktopWeb: boolean;
  mobilePadding: number;
}) => (isDesktopWeb ? desktopPadding : mobilePadding);

export const getFixedTopBarLayout = ({
  isCompactWeb = false,
  isDesktopWeb,
}: {
  isCompactWeb?: boolean;
  isDesktopWeb: boolean;
}) =>
  isDesktopWeb
    ? ({ height: 134, paddingTop: 8 } as const)
    : isCompactWeb
      ? ({ height: 126, paddingTop: 0 } as const)
      : ({ height: 186, paddingTop: 60 } as const);

export const getReelsOverlayLayout = ({
  isCompactWeb = false,
  isDesktopWeb,
}: {
  isCompactWeb?: boolean;
  isDesktopWeb: boolean;
}) =>
  isDesktopWeb
    ? ({
        headerHeight: 64,
        headerPaddingTop: 8,
        videoTopOffset: 0,
      } as const)
    : isCompactWeb
      ? ({
          headerHeight: 74,
          headerPaddingTop: 16,
          videoTopOffset: 0,
        } as const)
    : ({
        headerHeight: 90,
        headerPaddingTop: 40,
        videoTopOffset: 16,
      } as const);

export const getResponsiveDialogLayout = ({
  isDesktopWeb,
  maxWidth,
}: {
  isDesktopWeb: boolean;
  maxWidth: number;
}) =>
  isDesktopWeb
    ? ({
        backdrop: {
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        },
        surface: {
          borderRadius: 18,
          maxHeight: "84%",
          maxWidth,
          width: "100%",
        },
      } as const)
    : ({
        backdrop: { justifyContent: "flex-end" },
        surface: { width: "100%" },
      } as const);
