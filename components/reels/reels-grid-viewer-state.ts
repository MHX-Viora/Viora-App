export const getReelViewerIndex = ({
  itemCount,
  itemHeight,
  offset,
}: {
  itemCount: number;
  itemHeight: number;
  offset: number;
}) => {
  if (itemCount <= 0 || itemHeight <= 0) return null;

  const index = Math.round(Math.max(0, offset) / itemHeight);
  return Math.min(itemCount - 1, index);
};
