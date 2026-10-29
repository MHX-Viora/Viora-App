export function gameStreamLayout(width: number, height: number) {
  const sourceWidth = Number.isFinite(width) && width > 0 ? width : 1920;
  const sourceHeight = Number.isFinite(height) && height > 0 ? height : 1080;
  const scale = Math.min(1, 1920 / sourceWidth, 1080 / sourceHeight);
  const outputWidth = Math.max(2, Math.floor(sourceWidth * scale / 2) * 2);
  const outputHeight = Math.max(2, Math.floor(sourceHeight * scale / 2) * 2);
  const insetWidth = Math.floor(outputWidth * .24 / 2) * 2;
  const insetHeight = Math.max(2, Math.floor(insetWidth * 9 / 16 / 2) * 2);
  const gap = Math.max(8, Math.round(outputWidth * .018));
  return { width: outputWidth, height: outputHeight, inset: { width: insetWidth, height: insetHeight, x: outputWidth - insetWidth - gap, y: Math.max(gap, outputHeight - insetHeight - Math.round(outputHeight * .14)) } };
}
