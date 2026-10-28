/* global __dirname */
const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve, dirname, join } = require('node:path');
const base = require('../server/developer/vercel-base.json');
const { configureSandboxPolicy } = require('../server/developer/sandbox-policy.cjs');
const { configureMiniAppPolicy } = require('../server/mini-app-host-policy.cjs');
const root = resolve(__dirname, '..'), output = join(root, '.codex-tmp/stage8-web-export');
// Validate configuration before starting Expo; this script neither deploys nor contacts application APIs.
const configuration = configureMiniAppPolicy(configureSandboxPolicy(base, process.env), process.env);
if (!process.argv.includes('--config-only')) {
  for(const args of [[require.resolve('typescript/bin/tsc'),'-p','packages/miniapp-sdk/tsconfig.json'],[join(root,'packages/miniapp-sdk/scripts/build-browser.mjs')]]){
    const sdk=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});
    if(sdk.error||sdk.status!==0)process.exit(sdk.status||1);
  }
  const cli = join(dirname(require.resolve('expo/package.json')), 'bin/cli');
  // Expo inlines EXPO_PUBLIC_* into cached modules. A host/API origin change
  // must rebuild those modules along with the independently generated CSP.
  const result = spawnSync(process.execPath, [cli, 'export', '--platform', 'web', '--clear', '--output-dir', output], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'vercel.json'), JSON.stringify(configuration, null, 2) + '\n');
console.log('Mini App Web artifact prepared in .codex-tmp/stage8-web-export; no deployment performed.');
