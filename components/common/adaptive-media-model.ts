export function mediaHeight(width: number, ratio: number, maxHeight = Infinity) {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  return Math.min(Math.max(1, width) / safeRatio, maxHeight);
}

export function hasLetterbox(width: number, height: number, ratio: number) {
  return width > 0 && height > 0 && ratio > 0 &&
    Math.abs(width / height / ratio - 1) > 0.01;
}
