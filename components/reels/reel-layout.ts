export const WEB_REEL_VIDEO_STYLE = {
  height: "100%",
  maxHeight: "100%",
  maxWidth: "100%",
  objectFit: "contain",
  objectPosition: "center center",
  transform: "none",
  width: "100%",
} as const;

export const getReelVideoContentWidth = ({
  containerWidth,
}: {
  containerWidth: number;
  isDesktopWeb: boolean;
}) => Math.max(0, containerWidth);

export const getReelVideoVerticalShift = ({
  isDesktopWeb,
  nativeShift,
}: {
  isDesktopWeb: boolean;
  nativeShift: number;
}) => (isDesktopWeb ? 0 : nativeShift);

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
