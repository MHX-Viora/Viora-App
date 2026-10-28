const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve, join } = require('node:path');

function prepareVpsWeb(directory) {
  const output = resolve(directory);
  const html = readFileSync(join(output, 'index.html'), 'utf8');
  if (!/<script\b[^>]*\bsrc=["'][^"']*\/_expo\//i.test(html)) {
    throw new Error('Expected an exported HTML entry with an Expo bundle.');
  }
  // Nginx resolves the real public/developers asset directory before SPA fallback.
  // Give that directory the same bundled entry as the application root.
  mkdirSync(join(output, 'developers'), { recursive: true });
  writeFileSync(join(output, 'developers/index.html'), html);
}

if (require.main === module) {
  prepareVpsWeb(process.argv[2] || 'dist');
  console.log('Prepared the bundled /developers/ entry for Nginx.');
}
module.exports = { prepareVpsWeb };
