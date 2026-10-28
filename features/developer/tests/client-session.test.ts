import assert from "node:assert/strict";
import test from "node:test";
import { accountRequest, DEVELOPER_SESSION_EVENT } from "../lib/account-client";
import { getDeveloperPortalUrl } from "../../../utils/developer-portal";

test("Developer links stay in the current FE origin, including local development", () => {
  for (const origin of ["http://localhost:8081", "http://127.0.0.1:8081", "http://[::1]:8081", "https://mxh.ankt.vn", "https://staging.ankt.vn"])
    assert.equal(getDeveloperPortalUrl(origin), `${origin}/developers`);
  assert.equal(getDeveloperPortalUrl(), "https://mxh.ankt.vn/developers");
});
test("password reset and revoked sessions immediately invalidate Developer UI state", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalFetch = globalThis.fetch;
  const events: unknown[] = [];
  const target = new EventTarget();
  target.addEventListener(DEVELOPER_SESSION_EVENT, event => events.push((event as CustomEvent).detail.account));
  Object.defineProperty(globalThis, "window", { value: target, configurable: true });
  try {
    globalThis.fetch = async () => Response.json({ message: "Password reset" });
    await accountRequest("auth/reset-password", "POST", { token: "x".repeat(43), password: "example password" });
    assert.deepEqual(events, [null]);
    globalThis.fetch = async () => Response.json({ error: { message: "Expired" } }, { status: 401 });
    await assert.rejects(() => accountRequest("profile"));
    assert.deepEqual(events, [null, null]);
    await assert.rejects(() => accountRequest("auth/me"));
    assert.equal(events.length, 2, "session restoration does not recursively trigger invalidation");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
