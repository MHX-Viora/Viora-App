import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const base = require('../../../server/developer/vercel-base.json');
const { configureMiniAppPolicy } = require('../../../server/mini-app-host-policy.cjs');
const { configureSandboxPolicy } = require('../../../server/developer/sandbox-policy.cjs');
const env = { EXPO_PUBLIC_MINI_APP_RUNTIME_ENABLED: 'true', EXPO_PUBLIC_MINI_APP_HOST_ORIGIN: 'https://host.example',
  DEVELOPER_SITE_ORIGIN: 'https://app.example', EXPO_PUBLIC_API_URL: 'https://api.example', EXPO_PUBLIC_OPEN_API_ISSUER: 'https://issuer.example', ANKT_SANDBOX_HOST_ORIGIN: 'https://sandbox.example' };
test('public host CSP applies only to exact app route and composes without changing Developer/Sandbox/BFF rules', () => {
  const sandbox = configureSandboxPolicy(base, env), config = configureMiniAppPolicy(sandbox, env);
  assert.deepEqual(config.rewrites, base.rewrites); assert.deepEqual(config.headers.slice(0, sandbox.headers.length), sandbox.headers);
  const rule = config.headers.at(-1), pattern = new RegExp('^' + rule.source + '$'), appId = 'app_' + 'a'.repeat(43);
  assert.ok(pattern.test(`/mini-apps/${appId}`)); assert.ok(pattern.test(`/mini-apps/${appId}/`));
  for (const path of ['/developers/console', '/wallet', '/mini-apps/invalid', `/mini-apps/${appId}/edit`]) assert.equal(pattern.test(path), false);
  const csp = rule.headers.find((x: { key: string }) => x.key === 'Content-Security-Policy').value;
  assert.ok(csp.includes('frame-src https://host.example;')); assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(!/frame-src https:[;\s]/.test(csp)); assert.ok(!JSON.stringify(config.rewrites).includes('mini-app-host'));
  assert.throws(() => configureMiniAppPolicy(base, {}));
});

test('default Auth Bridge route policy allows partner frames without feature flags', () => {
  const config = configureMiniAppPolicy(base, { EXPO_PUBLIC_API_URL: 'https://api.example' });
  assert.deepEqual(config.rewrites, base.rewrites);
  assert.deepEqual(config.headers.slice(0, base.headers.length), base.headers);
  const rule = config.headers.at(-1);
  assert.equal(rule.source, '/mini-apps/(app_[A-Za-z0-9_-]{43})(/)?');
  const csp = rule.headers.find((x: { key: string }) => x.key === 'Content-Security-Policy').value;
  assert.ok(csp.includes('frame-src https:;'));
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.throws(() => configureMiniAppPolicy(base, { EXPO_PUBLIC_API_URL: 'http://api.example' }));
});
test('enabled config rejects privileged, ambiguous and malformed host origins before build', () => {
  for (const host of ['http://host.example', 'https://user:pass@host.example', 'https://host.example/x', 'https://host.example/?grant=x',
    'https://host.example/#x', 'https://host.example.', 'https://app.example:999', 'https://api.example', 'https://issuer.example', 'https://sandbox.example'])
    assert.throws(() => configureMiniAppPolicy(base, { ...env, EXPO_PUBLIC_MINI_APP_HOST_ORIGIN: host }));
  assert.throws(() => configureMiniAppPolicy(base, { EXPO_PUBLIC_MINI_APP_RUNTIME_ENABLED: 'true' }));
});
