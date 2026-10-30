export type GameCameraPosition = { x: number; y: number };
const clamp = (value: number, fallback = 0) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

export function gameStreamLayout(width: number, height: number, position?: GameCameraPosition) {
  const sourceWidth = Number.isFinite(width) && width > 0 ? width : 1920;
  const sourceHeight = Number.isFinite(height) && height > 0 ? height : 1080;
  const scale = Math.min(1, 1920 / sourceWidth, 1080 / sourceHeight);
  const outputWidth = Math.max(2, Math.floor(sourceWidth * scale / 2) * 2);
  const outputHeight = Math.max(2, Math.floor(sourceHeight * scale / 2) * 2);
  const insetWidth = Math.floor(outputWidth * .24 / 2) * 2;
  const insetHeight = Math.max(2, Math.floor(insetWidth * 9 / 16 / 2) * 2);
  const gap = Math.max(8, Math.round(outputWidth * .018));
  const defaultX = outputWidth - insetWidth - gap;
  const defaultY = Math.max(gap, outputHeight - insetHeight - Math.round(outputHeight * .14));
  const x = position ? Math.max(gap, Math.min(defaultX, Math.round(clamp(position.x, 1) * (outputWidth - insetWidth)))) : defaultX;
  const y = position ? Math.max(gap, Math.min(outputHeight - insetHeight - gap, Math.round(clamp(position.y, .86) * (outputHeight - insetHeight)))) : defaultY;
  return { width: outputWidth, height: outputHeight, inset: { width: insetWidth, height: insetHeight, x, y } };
}

export function moveGameCamera(layout: ReturnType<typeof gameStreamLayout>, dx: number, dy: number): GameCameraPosition {
  return {
    x: clamp((layout.inset.x + (Number.isFinite(dx) ? dx : 0)) / Math.max(1, layout.width - layout.inset.width)),
    y: clamp((layout.inset.y + (Number.isFinite(dy) ? dy : 0)) / Math.max(1, layout.height - layout.inset.height)),
  };
}
