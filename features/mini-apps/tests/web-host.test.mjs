import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript');
test('Web adapter attaches before navigating, targets exact host and disposes on unmount without storage writes', () => {
  const filename = fileURLToPath(new URL('../adapters/host.web.tsx', import.meta.url));
  const callbacks = [], listeners = new Map(), messages = [], statuses = [];
  let options, disposed = 0, received = 0, src = '';
  const element = { contentWindow: { postMessage: (message, origin) => messages.push({ message, origin }) },
    set src(value) { if (value !== 'about:blank') assert.equal(listeners.has('message'), true); src = value; } };
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: 'https://app.example' }, crypto: { randomUUID: () => 'request-id' },
    addEventListener: (type, callback) => listeners.set(type, callback), removeEventListener: type => listeners.delete(type) };
  const originalHost = process.env.EXPO_PUBLIC_MINI_APP_HOST_ORIGIN, originalApi = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_MINI_APP_HOST_ORIGIN = 'https://host.example'; process.env.EXPO_PUBLIC_API_URL = 'https://api.example';
  const overrides = {
    './auth-host.web': {default:()=>null},
    react: { useRef: initial => ({ current: initial === null ? element : initial }), useEffect: callback => callbacks.push(callback) },
    '../../../stores/session-store': { getSession: async () => ({ accessToken: 'only-api' }) },
    '../../../services/mini-app-launch.service': { productionHostOrigin: () => 'https://host.example', createMiniAppLaunchClient: () => ({ launch: async () => ({}) }) },
    '../lib/host-transport': { createProductionTransport: value => { options = value; return { handle: () => received++, dispose: () => disposed++ }; } },
  };
  try {
    const module = new Module(filename); module.filename = filename;
    module.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name);
    module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
    const root = module.exports.default({ appId: 'app_test', attempt: 1, onStatus: value => statuses.push(value) });
    const view=root.type(root.props);
    assert.equal(view.props.sandbox.includes('allow-top-navigation'), false); assert.equal(view.props.referrerPolicy, 'no-referrer');
    const cleanup = callbacks[0]();
    assert.equal(src, 'https://host.example/mini-app-host');
    listeners.get('message')({}); assert.equal(received, 1);
    options.send({ private: 'message' }); assert.equal(messages[0].origin, 'https://host.example');
    options.status('host.running'); cleanup(); assert.equal(src, 'about:blank'); assert.equal(disposed, 1);
    assert.equal(listeners.size, 0); options.status('bridge.connected'); assert.deepEqual(statuses, ['host.running']);
  } finally {
    globalThis.window = previousWindow;
    if (originalHost === undefined) delete process.env.EXPO_PUBLIC_MINI_APP_HOST_ORIGIN; else process.env.EXPO_PUBLIC_MINI_APP_HOST_ORIGIN = originalHost;
    if (originalApi === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = originalApi;
  }
});
