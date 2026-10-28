export function miniAppGridLayout(measuredWidth: number, fontScale = 1) {
  const width = Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : 80;
  const scale = Number.isFinite(fontScale) ? Math.max(1, Math.min(fontScale, 3)) : 1;
  const compact = scale === 1 && width < 356;
  const gap = compact ? 8 : 12;
  const minCellWidth = compact ? 56 : 80 * scale;
  const columns = Math.max(1, Math.min(compact ? 4 : 6, Math.floor((width + gap) / (minCellWidth + gap))));
  return { columns, cellWidth: (width - (columns - 1) * gap) / columns, gap };
}
