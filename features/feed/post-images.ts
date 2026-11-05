export const MAX_POST_IMAGES = 20;

export function appendPickedImages(current: string[], picked: string[]) {
  return [...current, ...picked].slice(0, MAX_POST_IMAGES);
}

export function getPostImageTiles(count: number, mode: "composer" | "feed") {
  const visibleCount = mode === "feed" ? Math.min(count, 4) : count;
  return Array.from({ length: visibleCount }, (_, index) => ({
    index,
    wide: index === 0 && (mode === "composer" ? count % 2 === 1 : count === 1 || count === 3),
    overlayCount: mode === "feed" && index === 3 && count > 4 ? count - 3 : 0,
  }));
}

/** Optimize unsigned standard Cloudinary URLs; preserve local, signed and custom-host URLs. */
export function postImagePreviewUrl(uri: string) {
  return uri.replace(
    /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?!s--)/,
    "$1c_limit,w_1000,h_1000,q_auto,f_auto/",
  );
}
