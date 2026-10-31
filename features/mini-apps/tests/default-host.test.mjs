import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript');

test('web and native select Auth Bridge without flags or with stale false flags', () => {
  const keys = ['EXPO_PUBLIC_MINI_APP_RUNTIME_ENABLED', 'EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED', 'EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED'];
  const previous = keys.map(key => process.env[key]);
  try {
    for (const flag of [undefined, 'false']) {
      for (const key of keys) {
        if (flag === undefined) delete process.env[key]; else process.env[key] = flag;
      }
      for (const platform of ['web', 'native']) {
        const filename = fileURLToPath(new URL(`../adapters/host.${platform}.tsx`, import.meta.url));
        const AuthHost = () => null;
        const module = new Module(filename); module.filename = filename;
        module.require = name => {
          if (name === `./auth-host.${platform}`) return { default: AuthHost };
          if (name === 'react/jsx-runtime' || name === 'react') return require(name);
          return {};
        };
        module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
        const props = { appId: 'app_' + 'a'.repeat(43), attempt: 1, onStatus() {} };
        const element = module.exports.default(props);
        assert.equal(element.type, AuthHost);
        assert.equal(element.props.appId, props.appId);
      }
    }
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});
