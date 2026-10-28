"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDeveloperHealth = checkDeveloperHealth;
async function checkDeveloperHealth(base, fetcher = fetch) {
    try {
        if (!base)
            throw new Error("Unconfigured");
        const origin = new URL(base);
        if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
            throw new Error("Invalid upstream origin");
        }
        const response = await fetcher(`${origin.origin}/api/developer/health`, {
            cache: "no-store", credentials: "omit", redirect: "error",
            headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000),
        });
        if (!response.ok)
            throw new Error("Upstream unavailable");
        const data = await response.json();
        if (!data || typeof data !== "object" || !("status" in data) || !("service" in data) || data.status !== "ok" || data.service !== "ankt-developer") {
            throw new Error("Unexpected payload");
        }
        return { ok: true, message: "Kết nối API ANKT thành công" };
    }
    catch {
        return { ok: false, message: "Chưa kết nối được API ANKT. Vui lòng thử lại sau." };
    }
}
