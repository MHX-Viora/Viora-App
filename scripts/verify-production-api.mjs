import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const expectedOrigin = 'https://api.mxh.ankt.vn';
const obsoleteOrigins = [
  'https://api.tvphapluat.com.vn',
  'https://viora-back-end-xmco.onrender.com',
];
let foundExpectedOrigin = false;
const output = path.resolve(process.argv[2] ?? 'dist');
const sdkDirectory = path.join(output, 'sdk');
const manifestPath = path.join(sdkDirectory, 'manifest.json');
const sdkVersion = name => /^ankt-miniapp\.v(\d+)\.(\d+)\.(\d+)\.min\.js$/.exec(name)?.slice(1).map(Number);
let currentSdkVersion;
if (existsSync(manifestPath)) {
  const { filename } = JSON.parse(readFileSync(manifestPath, 'utf8'));
  currentSdkVersion = typeof filename === 'string' ? sdkVersion(filename) : undefined;
  if (!currentSdkVersion || !existsSync(path.join(sdkDirectory, filename))) throw new Error('Invalid or missing current SDK artifact.');
}
function archivedSdk(directory, name) {
  if (directory !== sdkDirectory || !currentSdkVersion) return false;
  const version = sdkVersion(name);
  if (!version) return false;
  const difference = version.map((part, i) => part - currentSdkVersion[i]).find(value => value !== 0);
  return difference < 0;
}

function verify(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      verify(filename);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      // Versioned SDK archives retain their published bytes. Validate the current
      // manifest version, unversioned SDK, all app bundles and any newer artifact.
      if (archivedSdk(directory, entry.name)) continue;
      const source = readFileSync(filename, 'utf8');
      for (const origin of obsoleteOrigins) {
        if (source.includes(origin)) {
          throw new Error(`ANKT bundle contains obsolete API origin ${origin} in ${filename}. Rebuild with --clear and check the frontend environment.`);
        }
      }
      foundExpectedOrigin ||= source.includes(expectedOrigin);
    }
  }
}

verify(output);
if (!foundExpectedOrigin) {
  throw new Error(`ANKT bundle is missing ${expectedOrigin}. Set EXPO_PUBLIC_API_URL before exporting.`);
}
console.log('ANKT production API origin verified.');
