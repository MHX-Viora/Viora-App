import {readFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

// Read the generated private file directly; never paste its secret into a shell.
const directory = resolve(process.argv[2] ?? '');
const config = JSON.parse(readFileSync(join(directory, 'fixture.json'), 'utf8'));
const children = ['public', 'confidential'].map(kind => spawn(process.execPath,
  [fileURLToPath(new URL(`./${kind}/server.mjs`, import.meta.url))], {
    stdio: ['ignore', 'inherit', 'inherit'], env: {...process.env,
      NODE_EXTRA_CA_CERTS: join(directory, 'root-ca.pem'),
      ANKT_TLS_CERT: join(directory, 'tls-cert.pem'), ANKT_TLS_KEY: join(directory, 'tls-key.pem'),
      ANKT_ISSUER: config.issuer, ANKT_PARTNER_ORIGIN: config[kind + 'Origin'], ANKT_CLIENT_ID: config[kind + 'ClientId'],
      // Explicitly exclude a secret inherited from the launching environment for Public.
      ANKT_CLIENT_SECRET: kind === 'confidential' ? config.confidentialSecret : '',
    },
  }));
function stop() { for (const child of children) if (!child.killed) child.kill(); }
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
for (const child of children) child.on('exit', code => { if (code) { process.exitCode = 1; stop(); } });
