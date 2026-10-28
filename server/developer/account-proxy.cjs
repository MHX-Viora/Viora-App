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
function versionRoute(path) {
    const match = path.match(/^mini-apps\/app_[A-Za-z0-9_-]{43}\/versions(?:\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?$/i);
    return !match ? null : match[1] ? 'detail' : 'list';
}
function allowed(method, path) {
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/auth-bridge\/credentials\/(?:reveal|rotate|revoke)$/.test(path)) return method === 'POST';
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/auth-bridge$/.test(path)) return method === 'GET';
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/auth-bridge\/(launch|revoke)$/.test(path)) return method === 'POST';
    const inbox = notificationRoute(path);
    if (inbox) return inbox === 'list' ? method === 'GET' : method === 'POST';
    const version = versionRoute(path);
    if (version) return version === 'detail' ? ['GET', 'PUT'].includes(method) : ['GET', 'POST'].includes(method);
    const review = reviewRoute(path);
    if (review) return review === 'list' ? ['GET', 'POST'].includes(method) : method === 'GET';
    const publication = publicationRoute(path);
    if (publication) return publication === 'command' ? method === 'POST' : method === 'GET';
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/sandbox\/readiness$/.test(path)) return method === 'GET';
    const run = path.match(/^mini-apps\/app_[A-Za-z0-9_-]{43}\/sandbox\/test-runs(?:\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?$/i);
    if (run) return run[1] ? ['GET', 'DELETE'].includes(method) : ['GET', 'POST'].includes(method);
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/sandbox\/diagnostics$/.test(path)) return method === 'GET';
    const sandbox = path.match(/^mini-apps\/app_[A-Za-z0-9_-]{43}\/sandbox\/(config|sessions(?:\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/launch-grants)?)?)$/i);
    if (sandbox) return sandbox[1] === 'config' ? method === 'GET' : !sandbox[2] ? method === 'POST' : sandbox[3] ? method === 'POST' : ['GET', 'DELETE'].includes(method);
    if (path === "mini-apps") return ["GET", "POST"].includes(method);
    if (path === "mini-apps/logo") return method === "POST";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}$/.test(path)) return ["GET", "PATCH", "DELETE"].includes(method);
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/(activity)$/.test(path))
        return method === "GET";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/integration$/.test(path)) return ["GET", "PUT"].includes(method);
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/(domain-verification|readiness)$/.test(path)) return method === "GET";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/domain-verification\/file$/.test(path)) return method === "GET";
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/domain-verification\/(verify|regenerate)$/.test(path)) return method === "POST";
    return methods[method]?.includes(path) || (method === "DELETE" && /^(sessions|linked-accounts)\/[0-9a-f-]{36}$/i.test(path));
}
function reviewRoute(path) {
    if (/^mini-apps\/app_[A-Za-z0-9_-]{43}\/review-readiness$/.test(path)) return 'readiness';
    const match = path.match(/^mini-apps\/app_[A-Za-z0-9_-]{43}\/reviews(?:\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?$/i);
    return match ? match[1] ? 'detail' : 'list' : null;
}
function publicationRoute(path) {
    const match = path.match(/^mini-apps\/app_[A-Za-z0-9_-]{43}\/(publication-readiness|publications|publish|unpublish)$/);
    return !match ? null : match[1] === 'publication-readiness' ? 'readiness' : match[1] === 'publications' ? 'list' : 'command';
}
function notificationRoute(path) {
    if (path === 'review-notifications') return 'list';
    return /^review-notifications\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/read$/i.test(path) ? 'read' : null;
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
    const version = versionRoute(path);
    const review = reviewRoute(path);
    const publication = publicationRoute(path);
    const inbox = notificationRoute(path);
    const mime = request.headers.get("Content-Type")?.split(";")[0].trim();
    if (write && (!config.siteOrigin || request.headers.get("Origin") !== config.siteOrigin || request.headers.get("X-ANKT-Developer") !== "1" ||
        !(logo ? ["image/png", "image/jpeg", "image/webp"].includes(mime) : mime === "application/json") ||
        (request.headers.has("Sec-Fetch-Site") && request.headers.get("Sec-Fetch-Site") !== "same-origin")))
        return error(403, "CSRF_REJECTED", "Yêu cầu không hợp lệ. Hãy tải lại trang và thử lại.");
    try {
        let versionQuery = '';
        if (inbox) {
            const input = new URL(request.url).searchParams;
            if (new URL(request.url).search.length > 128 || [...input.keys()].some(key => inbox !== 'list' || input.getAll(key).length !== 1 ||
                !['page', 'pageSize', 'unread'].includes(key) || (key === 'unread' ? !['true', 'false'].includes(input.get(key)) :
                    !/^[1-9][0-9]{0,5}$/.test(input.get(key)) || Number(input.get(key)) > (key === 'page' ? 100000 : 100))))
                return error(400, 'INVALID_QUERY', 'Tham số inbox không hợp lệ.');
            versionQuery = input.size ? '?' + input.toString() : '';
        }
        if (version || review || publication) {
            const url = new URL(request.url); const input = url.searchParams;
            if (publication === 'readiness') {
                if (url.search.length > 128 || input.size !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.get('versionId') || '') ||
                    input.get('versionId') === '00000000-0000-0000-0000-000000000000') return error(400, 'INVALID_QUERY', 'Phải chọn phiên bản đã duyệt.');
            } else if (url.search.length > 128 || [...input.keys()].some(key => (version || review || publication) !== 'list' || request.method !== 'GET' ||
                !['page', 'pageSize'].includes(key) || input.getAll(key).length !== 1 ||
                !/^[1-9][0-9]{0,5}$/.test(input.get(key)) || Number(input.get(key)) > (key === 'page' ? 100000 : 100)))
                return error(400, 'INVALID_QUERY', 'Tham số phiên bản không hợp lệ.');
            versionQuery = input.size ? '?' + input.toString() : '';
        }
        const site = new URL(config.siteOrigin ?? "http://localhost:8081");
        const local = ["127.0.0.1", "localhost", "[::1]"].includes(site.hostname);
        const clientIp = request.headers.get("X-ANKT-Client-IP");
        if (config.production && !local && (site.protocol !== "https:" || !config.bffSecret || config.bffSecret.length < 32 || !clientIp || !(0, node_net_1.isIP)(clientIp)))
            return error(503, "INGRESS_UNAVAILABLE", "Cấu hình dịch vụ tài khoản chưa sẵn sàng.");
        let body;
        if (write) {
            const content = await limitedBody(request, logo ? 2097152 : inbox ? 1024 : publication ? 4096 : review ? 1024 : version ? version === 'detail' ? 16384 : 1024 : path.includes('/sandbox/') ? 1024 : path.startsWith("mini-apps") ? 65536 : 16384, logo);
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
        let query = request.method === "GET" && path === "mini-apps" ? `?page=${Math.max(1, Math.min(100000, Number(new URL(request.url).searchParams.get("page")) || 1))}` : "";
        if (version || review || publication || inbox) query = versionQuery;
        if (path.endsWith('/sandbox/readiness') && new URL(request.url).search) return error(400, 'INVALID_QUERY', 'Readiness không nhận tham số truy vấn.');
        if (path.endsWith('/sandbox/diagnostics') || request.method === 'GET' && path.endsWith('/sandbox/test-runs')) {
            const input = new URL(request.url).searchParams;
            const fields = path.endsWith('/diagnostics') ? ['sessionId', 'category', 'cursor', 'limit'] : ['sessionId', 'cursor', 'limit', 'order'];
            if (new URL(request.url).search.length > 1024 || [...input.keys()].some(key => !fields.includes(key) || input.getAll(key).length !== 1) ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.get('sessionId') || '') ||
                (input.has('category') && !['Runtime', 'SSO', 'Bridge', 'Configuration', 'Network', 'Permission'].includes(input.get('category'))) ||
                (input.has('order') && input.get('order') !== 'newest') ||
                (input.has('cursor') && !/^[0-9a-f]{32}$/i.test(input.get('cursor'))) ||
                (input.has('limit') && (!/^[1-9][0-9]{0,2}$/.test(input.get('limit')) || Number(input.get('limit')) > 100)))
                return error(400, 'INVALID_QUERY', 'Bộ lọc diagnostic không hợp lệ.');
            const safe = new URLSearchParams();
            for (const field of fields) if (input.has(field)) safe.set(field, input.get(field));
            query = '?' + safe.toString();
        }
        const reviewPreflight = request.method === 'GET' && /\/(?:review-readiness|publication-readiness)$/.test(path) ||
            request.method === 'POST' && /\/(?:reviews|publish)$/.test(path);
        const result = await fetcher(`${accountApiOrigin(config.apiOrigin)}/api/developer/${path}${query}`, {
            method: request.method, headers, body, cache: "no-store", credentials: "omit", redirect: "error", signal: AbortSignal.timeout(logo ? 60000 : path.endsWith('/sandbox/readiness') ? 35000 : reviewPreflight ? 45000 : 15000),
        });
        if (/\/auth-bridge\/credentials\/(reveal|rotate|revoke)$/.test(path)) {
            const privateHeaders = new Headers(result.headers);
            privateHeaders.set('Cache-Control', 'no-store');
            privateHeaders.set('Pragma', 'no-cache');
            return new Response(result.body, { status: result.status, headers: privateHeaders });
        }
        return result;
    }
    catch {
        return error(503, "SERVICE_UNAVAILABLE", "Không thể kết nối dịch vụ tài khoản. Vui lòng thử lại.");
    }
}
