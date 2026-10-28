const DOCS_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
function configureDocsPolicy(base, slugs) {
  if (!Array.isArray(slugs) || slugs.some(slug => typeof slug !== 'string' || slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) || new Set(slugs).size !== slugs.length) throw Error('Invalid documentation routes');
  const copy = structuredClone(base);
  copy.headers = [...(copy.headers || []), ...['/developers/docs', '/developers/docs/:path*'].map(source => ({ source, headers: [
    { key: 'Content-Security-Policy', value: DOCS_CSP }, { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
    { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' },
  ] }))];
  // Keep BFF/Sandbox/host rules intact. Known static pages resolve first; unknown
  // docs must reach the host's real 404 instead of the Social SPA fallback.
  const rewrites = (copy.rewrites || []).map(rule => rule.destination === '/' && rule.source.startsWith('/((?!')
    ? { ...rule, source: rule.source.replace('/((?!', '/((?!developers/docs(?:/|$)|developers/docs-assets/|') } : rule);
  copy.rewrites = [...slugs.map(slug => ({ source: `/developers/docs${slug ? '/' + slug : ''}`, destination: `/developers/docs${slug ? '/' + slug : ''}/index.html` })), ...rewrites];
  return copy;
}
module.exports = { configureDocsPolicy, DOCS_CSP };
