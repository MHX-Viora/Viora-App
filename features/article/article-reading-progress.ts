const READ_MILESTONES = [30, 70, 90] as const;

export const getReadPercentage = ({
  contentHeight,
  offsetY,
  viewportHeight,
}: {
  contentHeight: number;
  offsetY: number;
  viewportHeight: number;
}) => {
  if (contentHeight <= 0 || viewportHeight <= 0) return 0;
  return Math.round(
    Math.max(0, Math.min(100, ((Math.max(0, offsetY) + viewportHeight) / contentHeight) * 100)),
  );
};

export const getNextReadMilestone = (
  percentage: number,
  lastMilestone: number,
) =>
  READ_MILESTONES.find(
    (milestone) => milestone > lastMilestone && percentage >= milestone,
  ) ?? null;
