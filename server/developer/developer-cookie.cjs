"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.developerCookiePolicy = developerCookiePolicy;
function developerCookiePolicy(siteOrigin = process.env.SITE_ORIGIN ?? "http://localhost:8081") {
    const url = new URL(siteOrigin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.pathname !== "/" || url.search || url.hash || url.username || url.password)
        throw new Error("Developer cookies require an HTTPS origin, or HTTP loopback for local development.");
    const secure = url.protocol === "https:";
    return {
        name: secure ? "__Secure-ankt_developer" : "ankt_developer_local",
        options: { httpOnly: true, secure, sameSite: "lax", path: "/developers" },
    };
}
