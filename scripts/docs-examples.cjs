/* global __dirname */
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve, join } = require('node:path');
const root = resolve(__dirname, '../features/developer/docs');
const snippets = {
  publicClient: readFileSync(join(root, 'examples/public-client.ts'), 'utf8').replace('../../../../packages/miniapp-sdk/src/index', '@ankt/miniapp-sdk'),
};
writeFileSync(join(root, 'reference/example-snippets.json'), JSON.stringify(snippets, null, 2) + '\n');
console.log('Documentation snippets synchronized from tested example source.');
