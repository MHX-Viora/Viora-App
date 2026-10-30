type Size = { width: number; height: number };

export function svgaArtworkFrame(viewport: Size, movie: Size, fillWidth: boolean) {
  if (![viewport.width, viewport.height, movie.width, movie.height].every(v => Number.isFinite(v) && v > 0))
    return { left: 0, bottom: 0, width: 0, height: 0 };
  const scale = fillWidth ? viewport.width / movie.width : Math.min(viewport.width / movie.width, viewport.height / movie.height);
  const width = movie.width * scale, height = movie.height * scale;
  return { left: (viewport.width - width) / 2, bottom: 0, width, height };
}
