export const DEFAULT_CHAT_VIDEO_SIZE = { height: 180, width: 240 };

export const getChatVideoSize = ({
  height,
  width,
}: {
  height: number;
  width: number;
}) => {
  if (
    !Number.isFinite(height) ||
    !Number.isFinite(width) ||
    height <= 0 ||
    width <= 0
  ) {
    return DEFAULT_CHAT_VIDEO_SIZE;
  }

  const scale = Math.min(240 / width, 320 / height, 1);
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
};
