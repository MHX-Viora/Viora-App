/* global __dirname */
const { build } = require('esbuild');
const { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync, cpSync } = require('node:fs');
const { resolve, join, relative, isAbsolute } = require('node:path');
const root = resolve(__dirname, '..');
const { configureDocsPolicy } = require('../server/developer/docs-policy.cjs');
const { configureSandboxPolicy } = require('../server/developer/sandbox-policy.cjs');
const { configureMiniAppPolicy } = require('../server/mini-app-host-policy.cjs');

async function main() {
  const args = process.argv.slice(2), outputIndex = args.indexOf('--output-dir');
  const output = resolve(root, outputIndex < 0 ? '.codex-tmp/stage9-docs-export' : args[outputIndex + 1] || '');
  const bounded = relative(join(root, '.codex-tmp'), output);
  if (!bounded || bounded.startsWith('..') || isAbsolute(bounded)) throw Error('Output must be a child of workspace .codex-tmp');
  const baseIndex = args.indexOf('--base-export');
  if (baseIndex >= 0) {
    const source = resolve(root, args[baseIndex + 1] || ''), inside = relative(join(root, '.codex-tmp'), source);
    if (!inside || inside.startsWith('..') || isAbsolute(inside) || source === output || !existsSync(join(source, 'index.html'))) throw Error('Expected a separate workspace Expo export');
    cpSync(source, output, { recursive: true });
  }
  const buildRoot = join(root, '.codex-tmp/stage9-docs-build'); mkdirSync(buildRoot, { recursive: true });
  const shared = { bundle: true, jsx: 'automatic', logLevel: 'silent', absWorkingDir: root };
  await build({ ...shared, entryPoints: ['features/developer/docs/lib/render-document.tsx'], outfile: join(buildRoot, 'render.cjs'), platform: 'node', format: 'cjs', packages: 'external' });
  await build({ ...shared, entryPoints: ['features/developer/docs/lib/manifest.ts'], outfile: join(buildRoot, 'manifest.cjs'), platform: 'node', format: 'cjs', packages: 'external' });
  const { renderDocument, renderNotFoundDocument, publicOrigin } = require(join(buildRoot, 'render.cjs'));
  const { pages } = require(join(buildRoot, 'manifest.cjs'));
  const origin = publicOrigin(process.env.ANKT_DOCS_PUBLIC_ORIGIN || 'https://mxh.ankt.vn');
  const assets = join(output, 'developers/docs-assets'); mkdirSync(assets, { recursive: true });
  await build({ ...shared, entryPoints: ['features/developer/docs/client.web.tsx'], outfile: join(assets, 'client.js'), platform: 'browser', format: 'esm', minify: true, sourcemap: false, define: { 'process.env.NODE_ENV': '"production"' } });
  writeFileSync(join(assets, 'docs.css'), ['features/developer/docs/docs.css', 'features/developer/components/public-header.css', 'features/developer/components/public-footer.css'].map(file => readFileSync(join(root, file), 'utf8')).join('\n'));
  mkdirSync(join(output, 'developers'), { recursive: true });
  const brand = join(root, 'public/developers/brand.png');
  if (existsSync(brand)) copyFileSync(brand, join(output, 'developers/brand.png'));
  for (const page of pages) {
    const directory = join(output, 'developers/docs', page.slug); mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'index.html'), renderDocument(page, { origin, script: '/developers/docs-assets/client.js', stylesheet: '/developers/docs-assets/docs.css' }));
  }
  writeFileSync(join(output, 'docs-manifest.json'), JSON.stringify({ routes: pages.map(page => '/developers/docs' + (page.slug ? '/' + page.slug : '')) }));
  const existingSitemap = readFileSync(join(root, 'public/developer-sitemap.xml'), 'utf8');
  const paths = new Set([...existingSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname));
  for (const page of pages) paths.add('/developers/docs' + (page.slug ? '/' + page.slug : ''));
  writeFileSync(join(output, 'developer-sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + [...paths].sort().map(path => `  <url><loc>${origin}${path}</loc></url>`).join('\n') + '\n</urlset>\n');
  writeFileSync(join(output, 'robots.txt'), readFileSync(join(root, 'public/robots.txt'), 'utf8').replace(/^Sitemap:.*$/m, `Sitemap: ${origin}/developer-sitemap.xml`));
  writeFileSync(join(output, 'developers/docs-404.html'), renderNotFoundDocument({ script: '/developers/docs-assets/client.js', stylesheet: '/developers/docs-assets/docs.css' }));
  const base = require('../server/developer/vercel-base.json');
  const policy = configureDocsPolicy(configureMiniAppPolicy(configureSandboxPolicy(base, process.env), process.env), pages.map(page => page.slug));
  writeFileSync(join(output, 'vercel.json'), JSON.stringify(policy, null, 2) + '\n');
  console.log(`Prepared ${pages.length} public documentation page(s) in ${relative(root, output)}; no deployment.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
