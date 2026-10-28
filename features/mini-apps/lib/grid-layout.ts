export function miniAppGridLayout(measuredWidth: number, fontScale = 1) {
  const width = Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : 80;
  const scale = Number.isFinite(fontScale) ? Math.max(1, Math.min(fontScale, 3)) : 1;
  const gap = 12;
  const columns = Math.max(1, Math.min(6, Math.floor((width + gap) / (80 * scale + gap))));
  return { columns, cellWidth: (width - (columns - 1) * gap) / columns, gap };
}
