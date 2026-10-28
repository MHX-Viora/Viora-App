// Keep Vercel's two CSP rules mutually exclusive: browsers intersect policies.
function configureSandboxPolicy(base, environment) {
  const config = structuredClone(base);
  if (environment.EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED === 'true') {
    const common = config.headers.find(rule => rule.source === '/developers/:path*');
    const policy = common?.headers.find(header => header.key === 'Content-Security-Policy');
    if (!policy?.value.includes("frame-src 'none';")) throw Error('Missing Developer frame policy.');
    common.headers = common.headers.filter(header => header !== policy);
    let bridgePolicy=policy.value.replace("frame-src 'none';",'frame-src https:;');
    if(environment.EXPO_PUBLIC_OPEN_API_ISSUER){
      const legacyIssuer=new URL(environment.EXPO_PUBLIC_OPEN_API_ISSUER);
      if(legacyIssuer.protocol!=='https:'||legacyIssuer.username||legacyIssuer.password||legacyIssuer.pathname!=='/'||legacyIssuer.search||legacyIssuer.hash||legacyIssuer.hostname.includes('*'))throw Error('Invalid legacy issuer origin.');
      bridgePolicy=bridgePolicy.replace("form-action 'self';",`form-action 'self' ${legacyIssuer.origin};`);
    }
    config.headers.push(
      {source:'/developers/((?!console/apps/app_[A-Za-z0-9_-]{43}/sandbox/?$).*)',headers:[policy]},
      {source:'/developers/console/apps/(app_[A-Za-z0-9_-]{43})/sandbox(/)?',headers:[{...policy,value:bridgePolicy}]});
    return config;
  }
  if (!environment.ANKT_SANDBOX_HOST_ORIGIN && !environment.EXPO_PUBLIC_OPEN_API_ISSUER) return config;
  const host = environment.ANKT_SANDBOX_HOST_ORIGIN ? new URL(environment.ANKT_SANDBOX_HOST_ORIGIN) : null;
  const portal = host ? new URL(environment.DEVELOPER_SITE_ORIGIN) : null;
  const issuer = new URL(environment.EXPO_PUBLIC_OPEN_API_ISSUER);
  if ([host, portal, issuer].filter(Boolean).some(url => url.protocol !== 'https:' || url.hostname.includes('*') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) ||
      host && (host.hostname === portal.hostname || host.hostname === issuer.hostname))
    throw new Error('Sandbox requires a distinct HTTPS hostname and explicit Portal/issuer origins.');
  const common = config.headers.find(rule => rule.source === '/developers/:path*');
  const policy = common.headers.find(header => header.key === 'Content-Security-Policy');
  if (!policy?.value.includes("frame-src 'none';")) throw new Error('Missing default Developer frame policy.');
  common.headers = common.headers.filter(header => header !== policy);
  config.headers.push(
    { source:'/developers/((?!console/apps/app_[A-Za-z0-9_-]{43}/sandbox/?$).*)', headers:[policy] },
    { source:'/developers/console/apps/(app_[A-Za-z0-9_-]{43})/sandbox(/)?', headers:[{...policy, value:(host ? policy.value.replace("frame-src 'none';", `frame-src ${host.origin};`) : policy.value).replace("form-action 'self';", `form-action 'self' ${issuer.origin};`)}] },
  );
  return config;
}
module.exports = { configureSandboxPolicy };
