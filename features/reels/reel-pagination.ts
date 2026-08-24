export const getReelIndexFromOffset = ({
  itemCount,
  itemHeight,
  offsetY,
}: {
  itemCount: number;
  itemHeight: number;
  offsetY: number;
}) => {
  if (itemCount <= 0 || itemHeight <= 0 || !Number.isFinite(itemHeight)) {
    return 0;
  }

  const safeOffset = Number.isFinite(offsetY) ? Math.max(0, offsetY) : 0;
  return Math.min(itemCount - 1, Math.round(safeOffset / itemHeight));
};
