const ANKT_WEB_ORIGIN = "https://mxh.ankt.vn";

/** Developer pages belong to the same ANKT frontend, locally and in production. */
export function getDeveloperPortalUrl(webOrigin?: string): string {
  const origin = new URL(webOrigin || ANKT_WEB_ORIGIN);
  return `${origin.origin}/developers`;
}
