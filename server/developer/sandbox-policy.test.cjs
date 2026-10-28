const test = require('node:test');
const assert = require('node:assert/strict');
const base = require('./vercel-base.json');
const { configureSandboxPolicy } = require('./sandbox-policy.cjs');

const app = 'app_' + 'a'.repeat(43);
const environment = { ANKT_SANDBOX_HOST_ORIGIN:'https://sandbox.ankt.example', DEVELOPER_SITE_ORIGIN:'https://portal.ankt.example', EXPO_PUBLIC_OPEN_API_ISSUER:'https://issuer.ankt.example' };
function policies(config, path) {
  return config.headers.filter(rule => rule.source !== '/developers/:path*' && new RegExp('^' + rule.source + '$').test(path))
    .flatMap(rule => rule.headers.filter(header => header.key === 'Content-Security-Policy').map(header => header.value));
}
test('Sandbox CSP permits exactly the configured isolated host only on the owned-app route', () => {
  const config = configureSandboxPolicy(base, environment);
  for (const suffix of ['', '/']) {
    const values = policies(config, `/developers/console/apps/${app}/sandbox${suffix}`);
    assert.equal(values.length, 1);
    assert.ok(values[0].includes('frame-src https://sandbox.ankt.example;'));
    assert.ok(values[0].includes("frame-ancestors 'none'"));
  }
  for (const path of ['/developers/', '/developers/console', `/developers/console/apps/${app}`, `/developers/console/apps/${app}/sandbox/extra`, '/developers/console/apps/invalid/sandbox', '/developers/api/account/profile']) {
    const values = policies(config, path);
    assert.equal(values.length, 1, path);
    assert.ok(values[0].includes("frame-src 'none';"), path);
  }
  assert.deepEqual(config.rewrites, base.rewrites);
  assert.ok(base.headers[0].headers.some(header => header.value.includes("frame-src 'none'")));
});
test('disabled Sandbox preserves policy; unsafe or privileged host configuration fails closed', () => {
  assert.deepEqual(configureSandboxPolicy(base, {}), base);
  for (const value of ['http://sandbox.example', '*', 'https://user:password@host.example', 'https://host.example/path', 'https://host.example/?x=y', 'https://host.example/#x', 'https://portal.ankt.example:444', 'https://issuer.ankt.example'])
    assert.throws(() => configureSandboxPolicy(base, {...environment, ANKT_SANDBOX_HOST_ORIGIN:value}));
  assert.throws(() => configureSandboxPolicy(base, {ANKT_SANDBOX_HOST_ORIGIN:environment.ANKT_SANDBOX_HOST_ORIGIN}));
});
