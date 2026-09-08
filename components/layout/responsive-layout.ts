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

export const getFeedCategorySidebarLayout = ({
  feedMaxWidth,
  isDesktopWeb,
  pageGutter,
  viewportWidth,
}: {
  feedMaxWidth: number;
  isDesktopWeb: boolean;
  pageGutter: number;
  viewportWidth: number;
}) => {
  if (!isDesktopWeb || viewportWidth < 1440) return null;

  const sideSpace = Math.max(0, (viewportWidth - feedMaxWidth) / 2);
  const sidebarGap = 8;

  return {
    left: -Math.floor(sideSpace - pageGutter),
    width: Math.min(
      240,
      Math.max(120, Math.floor(sideSpace - pageGutter - sidebarGap)),
    ),
  } as const;
};

export const getFeedDownloadPromoLayout = ({
  feedMaxWidth,
  isDesktopWeb,
  pageGutter,
  viewportWidth,
}: {
  feedMaxWidth: number;
  isDesktopWeb: boolean;
  pageGutter: number;
  viewportWidth: number;
}) => {
  if (!isDesktopWeb || viewportWidth < 1440) return null;

  const sideSpace = Math.max(0, (viewportWidth - feedMaxWidth) / 2);
  const railWidth = Math.floor(sideSpace - pageGutter - 8);

  if (railWidth < 272) return null;

  return {
    right: -Math.floor(sideSpace - pageGutter),
    width: Math.min(300, railWidth),
  } as const;
};

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
  categoryOnly = false,
  isArticle = false,
  isCompactWeb = false,
  isDesktopWeb,
  useDesktopSideRails = false,
}: {
  categoryOnly?: boolean;
  isArticle?: boolean;
  isCompactWeb?: boolean;
  isDesktopWeb: boolean;
  useDesktopSideRails?: boolean;
}) => {
  if (categoryOnly) {
    return useDesktopSideRails
      ? ({ height: 0, paddingTop: 0 } as const)
      : isDesktopWeb || isCompactWeb
      ? ({ height: 50, paddingTop: 0 } as const)
      : ({ height: 55, paddingTop: 0 } as const);
  }

  if (isArticle) {
    return useDesktopSideRails
      ? ({ height: 112, paddingTop: 0 } as const)
      : isDesktopWeb || isCompactWeb
      ? ({ height: 170, paddingTop: 0 } as const)
      : ({ height: 175, paddingTop: 0 } as const);
  }

  return useDesktopSideRails
    ? ({ height: 68, paddingTop: 0 } as const)
    : isDesktopWeb || isCompactWeb
      ? ({ height: 126, paddingTop: 0 } as const)
      : ({ height: 131, paddingTop: 0 } as const);
};

export const getFixedTopBarBackgroundLayout = ({
  barHeight,
  isWeb,
  topInset,
}: {
  barHeight: number;
  isWeb: boolean;
  topInset: number;
}) => {
  const safeTopInset =
    Number.isFinite(topInset) && topInset > 0 ? topInset : 0;

  return isWeb
    ? ({ height: barHeight, paddingTop: 0, top: 0 } as const)
    : ({
        height: barHeight + safeTopInset,
        paddingTop: safeTopInset,
        top: -safeTopInset,
      } as const);
};

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
        headerHeight: 62,
        headerPaddingTop: 12,
        videoTopOffset: 0,
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
