export const BASE_PATH = "/developers";

export function siteUrl(path = "/", origin = "https://mxh.ankt.vn") {
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash || url.username || url.password)
    throw new Error("Expected an HTTP(S) origin without credentials or path");
  return `${url.origin}${BASE_PATH}${path === "/" ? "" : path}`;
}
export function pageMetadata(title: string, path: string, description: string, index = true) {
  return { title: `${title} | ANKT Developer`, description, canonical: siteUrl(path), index };
}
