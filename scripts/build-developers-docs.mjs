import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages, revision } from '../features/developers/content.mjs';
import { renderDocument, validateContent } from '../features/developers/render.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, process.argv[2] || 'dist');
if (!dist.startsWith(root + '\\') && !dist.startsWith(root + '/')) throw new Error('Output must be inside the app workspace');
await readFile(join(dist, 'index.html')); // Require a completed Expo export.
const errors = validateContent();
if (errors.length) throw new Error(errors.join('\n'));
for (const page of pages) {
  const directory = join(dist, page.path.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), renderDocument(page.slug));
}
const assets = join(dist, 'developers-assets');
await mkdir(assets, { recursive: true });
for (const name of ['docs.css', 'client.mjs', 'bootstrap.mjs', 'content.mjs']) await copyFile(join(root, 'features/developers', name), join(assets, name));
await writeFile(join(assets, 'search-index.json'), JSON.stringify(pages.map(({ title, description, path, keywords, sections }) => ({ title, description, path, keywords, sections }))));
await writeFile(join(dist, 'sitemap-developers.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `<url><loc>https://mxh.ankt.vn${page.path}</loc><lastmod>${revision}</lastmod></url>`).join('')}</urlset>`);
const robotsPath = join(dist, 'robots.txt');
const robots = (await readFile(robotsPath, 'utf8').catch(() => 'User-agent: *\n')).replace(/\n?# ANKT Developers[\s\S]*?(?:# End ANKT Developers\n?|$)/g, '\n');
await writeFile(robotsPath, `${robots.trim()}\n# ANKT Developers\nDisallow: /developers/console\nDisallow: /developers/register\nSitemap: https://mxh.ankt.vn/sitemap-developers.xml\n# End ANKT Developers\n`);
console.log(`Generated and validated ${pages.length} public developer pages.`);
