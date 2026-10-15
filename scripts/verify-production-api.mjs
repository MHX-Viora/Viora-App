import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const expectedOrigin = 'https://api.mxh.ankt.vn';
const obsoleteOrigins = [
  'https://api.tvphapluat.com.vn',
  'https://viora-back-end-xmco.onrender.com',
];
let foundExpectedOrigin = false;

function verify(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      verify(filename);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
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

verify(path.resolve(process.argv[2] ?? 'dist'));
if (!foundExpectedOrigin) {
  throw new Error(`ANKT bundle is missing ${expectedOrigin}. Set EXPO_PUBLIC_API_URL before exporting.`);
}
console.log('ANKT production API origin verified.');
