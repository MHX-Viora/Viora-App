import { gameStreamLayout, moveGameCamera } from './game-stream-layout';
import { getHostVideoFrame } from './host-video-frame';

export type LivePresentation = { version: 1; width: number; height: number; cameraOn: boolean; cameraX: number; cameraY: number };
type Size = { width: number; height: number };
export type VideoRect = Size & { left: number; top: number };

export function parseLivePresentation(value: unknown): LivePresentation | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as LivePresentation;
  if (p.version !== 1 || typeof p.cameraOn !== 'boolean' ||
    ![p.width, p.height].every(v => Number.isInteger(v) && v >= 2 && v <= 4096 && v % 2 === 0) ||
    ![p.cameraX, p.cameraY].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) return null;
  return { version: 1, width: p.width, height: p.height, cameraOn: p.cameraOn, cameraX: p.cameraX, cameraY: p.cameraY };
}

export function describeGamePresentation(layout: ReturnType<typeof gameStreamLayout>, cameraOn: boolean): LivePresentation {
  const position = moveGameCamera(layout, 0, 0);
  return { version: 1, width: layout.width, height: layout.height, cameraOn, cameraX: position.x, cameraY: position.y };
}

export function packedGameFrame(layout: ReturnType<typeof gameStreamLayout>) {
  return { width: layout.width, height: layout.height + layout.inset.height,
    screen: { left: 0, top: 0, width: layout.width, height: layout.height },
    camera: { left: 0, top: layout.height, width: layout.inset.width, height: layout.inset.height } };
}

export function audiencePresentationLayout(stage: Size, p: LivePresentation) {
  const mobile = stage.width < 900 && stage.height > stage.width;
  const top = mobile ? 76 : 0, bottom = mobile ? 88 : 0;
  const area = { width: Math.min(stage.width, 1100), height: Math.max(1, stage.height - top - bottom) };
  const fitted = getHostVideoFrame(area, p);
  if (!fitted) return null;
  const screen: VideoRect = { ...fitted, left: fitted.left + (stage.width - area.width) / 2, top: fitted.top + top };
  const layout = gameStreamLayout(p.width, p.height, { x: p.cameraX, y: p.cameraY });
  const scale = screen.width / p.width;
  let camera: VideoRect = { left: screen.left + layout.inset.x * scale, top: screen.top + layout.inset.y * scale, width: layout.inset.width * scale, height: layout.inset.height * scale };
  const band = (area.height - screen.height) / 2;
  if (mobile && band >= 64) {
    const cameraWidth = Math.min(stage.width * .68, (band - 12) * 16 / 9);
    const cameraHeight = cameraWidth * 9 / 16;
    camera = { width: cameraWidth, height: cameraHeight, left: (stage.width - cameraWidth) / 2,
      top: (p.cameraY < .5 ? top : screen.top + screen.height) + (band - cameraHeight) / 2 };
  }
  return { screen, camera: p.cameraOn ? camera : null, packed: packedGameFrame(layout) };
}

export function giftEffectFrame(stage: Size, compact: boolean) {
  const width = compact ? stage.width : Math.min(stage.width, 620);
  const height = Math.max(0, Math.min(stage.height * .78, width * 1.8));
  return { left: (stage.width - width) / 2, top: (stage.height - height) / 2, width, height };
}
