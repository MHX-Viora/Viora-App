export const MIN_MESSAGE_INPUT_HEIGHT = 44;
export const MAX_MESSAGE_INPUT_HEIGHT = 116;

export const getMessageInputHeight = (contentHeight: number) => {
  if (!Number.isFinite(contentHeight)) return MIN_MESSAGE_INPUT_HEIGHT;
  return Math.min(
    MAX_MESSAGE_INPUT_HEIGHT,
    Math.max(MIN_MESSAGE_INPUT_HEIGHT, contentHeight),
  );
};

export const isMessageInputScrollable = (contentHeight: number) =>
  Number.isFinite(contentHeight) && contentHeight >= MAX_MESSAGE_INPUT_HEIGHT;
