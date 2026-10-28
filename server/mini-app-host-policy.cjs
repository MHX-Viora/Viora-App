function exactOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.hostname.endsWith('.'))
    throw new Error('Mini App requires explicit HTTPS origins.');
  return url;
}
function configureMiniAppPolicy(base, environment) {
  const config = structuredClone(base);
  if (environment.EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED === 'true') {
    exactOrigin(environment.EXPO_PUBLIC_API_URL);
    config.headers.push({source:'/mini-apps/(app_[A-Za-z0-9_-]{43})(/)?',headers:[
      {key:'Cache-Control',value:'private, no-store'},{key:'Referrer-Policy',value:'no-referrer'},
      {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; connect-src 'self' https: wss:; frame-src https:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"}]});
    return config;
  }
  if (environment.EXPO_PUBLIC_MINI_APP_RUNTIME_ENABLED !== 'true') return config;
  const host = exactOrigin(environment.EXPO_PUBLIC_MINI_APP_HOST_ORIGIN);
  const app = exactOrigin(environment.EXPO_PUBLIC_APP_ORIGIN || environment.DEVELOPER_SITE_ORIGIN);
  const api = exactOrigin(environment.EXPO_PUBLIC_API_URL), issuer = exactOrigin(environment.EXPO_PUBLIC_OPEN_API_ISSUER);
  const reserved = [app, api, issuer];
  if (environment.ANKT_SANDBOX_HOST_ORIGIN) reserved.push(exactOrigin(environment.ANKT_SANDBOX_HOST_ORIGIN));
  if (environment.DEVELOPER_SITE_ORIGIN) reserved.push(exactOrigin(environment.DEVELOPER_SITE_ORIGIN));
  if (reserved.some(url => url.hostname === host.hostname)) throw new Error('Mini App host must use a separate hostname.');
  config.headers.push({ source: '/mini-apps/(app_[A-Za-z0-9_-]{43})(/)?', headers: [
    { key: 'Cache-Control', value: 'private, no-store' }, { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    { key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self' data:; connect-src 'self' https: wss:; media-src 'self' https: blob:; object-src 'none'; frame-src ${host.origin}; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` },
  ] });
  return config;
}
module.exports = { configureMiniAppPolicy };
