const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');
const { prepareVpsWeb } = require('./prepare-vps-web.cjs');

test('serves the exported SPA at the existing developers asset directory', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ankt-vps-entry-'));
  try {
    mkdirSync(join(directory, 'developers'));
    writeFileSync(join(directory, 'developers/brand.png'), 'existing image');
    const html = '<html><script src="/_expo/app.js"></script></html>';
    writeFileSync(join(directory, 'index.html'), html);
    prepareVpsWeb(directory);
    assert.equal(readFileSync(join(directory, 'developers/index.html'), 'utf8'), html);
    assert.equal(readFileSync(join(directory, 'developers/brand.png'), 'utf8'), 'existing image');
    prepareVpsWeb(directory);
    assert.equal(readFileSync(join(directory, 'developers/index.html'), 'utf8'), html);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('rejects missing or unbundled exports', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ankt-vps-invalid-'));
  try {
    assert.throws(() => prepareVpsWeb(directory));
    writeFileSync(join(directory, 'index.html'), '<html>Unbundled template</html>');
    assert.throws(() => prepareVpsWeb(directory), /Expo bundle/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
