"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountApiOrigin = accountApiOrigin;
exports.proxyAccountRequest = proxyAccountRequest;
const node_crypto_1 = require("node:crypto");
const node_net_1 = require("node:net");
const methods = {
    GET: ["auth/me", "profile", "sessions", "linked-accounts", "linked-accounts/ankt/callback"],
    POST: ["auth/register", "auth/login", "auth/logout", "auth/logout-all", "auth/refresh", "auth/verify-email", "auth/resend-verification", "auth/forgot-password", "auth/reset-password", "auth/change-password", "linked-accounts/ankt/start"],
    PATCH: ["profile"],
};
function accountApiOrigin(value = process.env.ANKT_API_BASE_URL) {
    if (!value)
        throw new Error("API not configured");
    const url = new URL(value);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))) || url.pathname !== "/" || url.search || url.hash || url.username || url.password)
        throw new Error("Invalid API origin");
    return url.origin;
}
function allowed(method, path) {
    if (path === "mini-apps") return ["GET", "POST"].includes(method);
    if (path === "mini-apps/logo") return method === "POST";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}$/.test(path)) return ["GET", "PATCH", "DELETE"].includes(method);
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/(credentials|redirect-uris|activity)$/.test(path))
        return method === "GET" || (method === "PUT" && path.endsWith("/redirect-uris"));
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/credentials\/rotate$/.test(path)) return method === "POST";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/integration$/.test(path)) return ["GET", "PUT"].includes(method);
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/sso$/.test(path)) return method === "GET";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/sso\/(Sandbox|Production)$/.test(path)) return method === "PUT";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/(domain-verification|readiness)$/.test(path)) return method === "GET";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/domain-verification\/file$/.test(path)) return method === "GET";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/domain-verification\/(verify|regenerate)$/.test(path)) return method === "POST";
    return methods[method]?.includes(path) || (method === "DELETE" && /^(sessions|linked-accounts)\/[0-9a-f-]{36}$/i.test(path));
}
function error(status, code, message) { return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } }); }
async function limitedBody(request, maximum = 16384, binary = false) {
    const reader = request.body?.getReader();
    if (!reader)
        return "{}";
    const chunks = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            total += value.byteLength;
            if (total > maximum) {
                await reader.cancel();
                return null;
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return binary ? buffer : new TextDecoder().decode(buffer) || "{}";
}
async function proxyAccountRequest(request, path, config, fetcher = fetch) {
    if (!allowed(request.method, path))
        return error(404, "NOT_FOUND", "Không tìm thấy API.");
    const write = !["GET", "HEAD"].includes(request.method);
    const logo = path === "mini-apps/logo";
    const mime = request.headers.get("Content-Type")?.split(";")[0].trim();
    if (write && (!config.siteOrigin || request.headers.get("Origin") !== config.siteOrigin || request.headers.get("X-ANKT-Developer") !== "1" ||
        !(logo ? ["image/png", "image/jpeg", "image/webp"].includes(mime) : mime === "application/json") ||
        (request.headers.has("Sec-Fetch-Site") && request.headers.get("Sec-Fetch-Site") !== "same-origin")))
        return error(403, "CSRF_REJECTED", "Yêu cầu không hợp lệ. Hãy tải lại trang và thử lại.");
    try {
        const site = new URL(config.siteOrigin ?? "http://localhost:8081");
        const local = ["127.0.0.1", "localhost", "[::1]"].includes(site.hostname);
        const clientIp = request.headers.get("X-ANKT-Client-IP");
        if (config.production && !local && (site.protocol !== "https:" || !config.bffSecret || config.bffSecret.length < 32 || !clientIp || !(0, node_net_1.isIP)(clientIp)))
            return error(503, "INGRESS_UNAVAILABLE", "Cấu hình dịch vụ tài khoản chưa sẵn sàng.");
        let body;
        if (write) {
            const content = await limitedBody(request, logo ? 2097152 : path.startsWith("mini-apps") ? 65536 : 16384, logo);
            if (content === null)
                return error(413, "REQUEST_TOO_LARGE", "Yêu cầu quá lớn.");
            if (!logo) try {
                const data = JSON.parse(content);
                if (!data || typeof data !== "object" || Array.isArray(data))
                    throw new Error();
            }
            catch {
                return error(400, "INVALID_JSON", "Dữ liệu gửi không hợp lệ.");
            }
            body = content;
        }
        const headers = new Headers({ Accept: "application/json", "Content-Type": logo ? mime : "application/json" });
        if (config.bffSecret && config.bffSecret.length >= 32 && clientIp && (0, node_net_1.isIP)(clientIp)) {
            const time = Math.floor(Date.now() / 1000).toString();
            const message = `${clientIp}\n${time}\n${request.method}\n/api/developer/${path}`;
            headers.set("X-ANKT-Bff-IP", clientIp);
            headers.set("X-ANKT-Bff-Time", time);
            headers.set("X-ANKT-Bff-Signature", (0, node_crypto_1.createHmac)("sha256", config.bffSecret).update(message).digest("hex"));
        }
        if (config.token)
            headers.set("Authorization", `DeveloperSession ${config.token}`);
        const userAgent = request.headers.get("User-Agent");
        if (userAgent)
            headers.set("User-Agent", userAgent.slice(0, 256));
        const query = request.method === "GET" && path === "mini-apps" ? `?page=${Math.max(1, Math.min(100000, Number(new URL(request.url).searchParams.get("page")) || 1))}` : "";
        return await fetcher(`${accountApiOrigin(config.apiOrigin)}/api/developer/${path}${query}`, {
            method: request.method, headers, body, cache: "no-store", credentials: "omit", redirect: "error", signal: AbortSignal.timeout(logo ? 60000 : 15000),
        });
    }
    catch {
        return error(503, "SERVICE_UNAVAILABLE", "Không thể kết nối dịch vụ tài khoản. Vui lòng thử lại.");
    }
}
