import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript');

function fixture({ enabled = true, installed = true, platform = 'android', mounted = false } = {}) {
  const filename = fileURLToPath(new URL('../adapters/host.native.tsx', import.meta.url));
  const effects = [], statuses = [], refs = [], states = [], events = new Map();
  let resolved = 0, disposed = 0, stops = 0, options, request, stateIndex = 0, hostProps;
  const overrides = {
    './auth-host.native': {default:()=>null},
    react: { useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
      useEffect: callback => effects.push(callback), useState: () => [mounted ? (++stateIndex === 1 ? {} : 'NativeHost') : null, value => states.push(value)] },
    'react/jsx-runtime': { jsx: (type, props) => { if (type === 'NativeHost') hostProps = props; return { type, props }; } },
    'react-native': { View: 'View', Platform: { OS: platform },
      AppState: { addEventListener: (_name, callback) => { events.set('state', callback); return { remove: () => events.delete('state') }; } },
      BackHandler: { addEventListener: (_name, callback) => { events.set('back', callback); return { remove: () => events.delete('back') }; } } },
    'expo-modules-core': { requireOptionalNativeModule: () => installed ? {} : null,
      requireNativeViewManager: () => { resolved++; return 'NativeHost'; } },
    'expo-crypto': { randomUUID: () => 'request-id' },
    '../../../stores/session-store': { getSession: async () => ({ accessToken: 'only-native-api' }) },
    '../../../services/mini-app-launch.service': { productionHostOrigin: () => 'https://host.test',
      createMiniAppLaunchClient: () => ({ launch: async (_appId, value, token) => { request = { ...value, token }; return {}; } }) },
    '../lib/native-navigation': { nativeHostUrl: value => value },
    '../lib/native-host-channel': { createNativeHostChannel: value => { options = value; return { receive() {}, dispose: () => disposed++ }; } },
  };
  const previous = process.env.EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED;
  process.env.EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED = String(enabled);
  try {
    const module = new Module(filename); module.filename = filename;
    module.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name);
    module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
    const root=module.exports.default({ appId: 'app_test', attempt: 1, onStatus: value => statuses.push(value) });
    root.type(root.props);
    refs[0].current = { send: async () => {}, stop: async () => { stops++; } };
    const cleanup = effects[0]();
    return { cleanup, events, statuses, states, options, resolved: () => resolved,
      disposed: () => disposed, stops: () => stops, request: () => request, hostProps };
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED;
    else process.env.EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED = previous;
  }
}

test('native host default off and missing development module fail before loading any document', () => {
  for (const input of [{ enabled: false }, { installed: false }]) {
    const f = fixture(input);
    assert.deepEqual(f.statuses, ['host.error']); assert.equal(f.resolved(), 0);
    assert.equal(f.states.some(value => value?.url), false); f.cleanup();
    assert.equal(f.events.size, 0);
  }
});

test('native platform error stops once and rejects late channel or repeated error callbacks', () => {
  const f = fixture({ mounted: true });
  try {
    f.hostProps.onHostError();
    assert.equal(f.stops(), 1);
    assert.deepEqual(f.statuses, ['host.error']);
    f.options.status('host.running'); f.hostProps.onHostError();
    assert.equal(f.stops(), 1);
    assert.deepEqual(f.statuses, ['host.error']);
  } finally { f.cleanup(); }
  assert.equal(f.events.size, 0);
});
for (const platform of ['android', 'ios']) test(platform + ' adapter keeps Social token in API launch and closes on background without restoring credentials', async () => {
  const f = fixture({ platform });
  await f.options.launch('binding', 'nonce', new AbortController().signal);
  assert.equal(f.request().platform, platform === 'ios' ? 'iOS' : 'Android');
  assert.equal(f.request().token, 'only-native-api');
  assert.equal(JSON.stringify(f.states).includes('only-native-api'), false);
  f.events.get('state')('background');
  assert.deepEqual(f.statuses, ['host.close_unconfirmed']); assert.equal(f.stops(), 1);
  f.events.get('state')('active'); f.options.status('bridge.connected');
  assert.deepEqual(f.statuses, ['host.close_unconfirmed']); f.cleanup();
  assert.equal(f.events.size, 0); assert.ok(f.disposed() >= 1);
});
