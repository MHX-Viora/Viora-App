type Size = { width: number; height: number };

export function getHostVideoFrame(stage: Size, video: Size) {
  if (![stage.width, stage.height, video.width, video.height].every(value => Number.isFinite(value) && value > 0)) return null;
  const scale = Math.min(stage.width / video.width, stage.height / video.height);
  const width = video.width * scale;
  const height = video.height * scale;
  return { width, height, left: (stage.width - width) / 2, top: (stage.height - height) / 2 };
}
