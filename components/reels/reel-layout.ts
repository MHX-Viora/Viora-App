export const WEB_REEL_VIDEO_STYLE = {
  height: "100%",
  maxHeight: "100%",
  maxWidth: "100%",
  objectFit: "contain",
  objectPosition: "center center",
  transform: "none",
  width: "100%",
} as const;

const DESKTOP_COPY_MAX_WIDTH = 560;
const DESKTOP_COPY_MIN_WIDTH = 240;
const DESKTOP_COPY_OUTER_GAP = 32;

export const getReelVideoContentWidth = ({
  containerWidth,
  isDesktopWeb,
  viewportWidth,
}: {
  containerWidth: number;
  isDesktopWeb: boolean;
  viewportWidth?: number;
}) => {
  const safeContainerWidth = Math.max(0, containerWidth);
  const safeViewportWidth = viewportWidth ?? 0;
  if (
    isDesktopWeb ||
    !Number.isFinite(safeViewportWidth) ||
    safeViewportWidth <= 0
  ) {
    return safeContainerWidth;
  }

  return Math.min(safeContainerWidth, safeViewportWidth);
};

export const getReelVideoVerticalShift = ({
  isDesktopWeb,
  nativeShift,
}: {
  isDesktopWeb: boolean;
  nativeShift: number;
}) => (isDesktopWeb ? 0 : nativeShift);

export const getReelDesktopCopyWidth = ({
  containerWidth,
  videoWidth,
}: {
  containerWidth: number;
  videoWidth: number;
}) => {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(videoWidth) ||
    containerWidth <= 0 ||
    videoWidth <= 0 ||
    videoWidth > containerWidth
  ) {
    return null;
  }

  const availableWidth = Math.floor(
    (containerWidth - videoWidth) / 2 - DESKTOP_COPY_OUTER_GAP,
  );
  return availableWidth >= DESKTOP_COPY_MIN_WIDTH
    ? Math.min(DESKTOP_COPY_MAX_WIDTH, availableWidth)
    : null;
};

export const getContainedVideoSize = ({
  containerHeight,
  containerWidth,
  videoHeight,
  videoWidth,
}: {
  containerHeight: number;
  containerWidth: number;
  videoHeight: number;
  videoWidth: number;
}) => {
  if (
    !Number.isFinite(containerHeight) ||
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(videoHeight) ||
    !Number.isFinite(videoWidth) ||
    containerHeight <= 0 ||
    containerWidth <= 0 ||
    videoHeight <= 0 ||
    videoWidth <= 0
  ) {
    return null;
  }

  const scale = Math.min(
    containerWidth / videoWidth,
    containerHeight / videoHeight,
  );

  return {
    height: Math.round(videoHeight * scale),
    width: Math.round(videoWidth * scale),
  };
};
