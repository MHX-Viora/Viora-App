export type SsoEnvironment='Sandbox'|'Production';
export type SsoScope='openid'|'profile'|'email';
export type SsoClient={clientId:string;clientType:'Public'|'Confidential';environment:SsoEnvironment;sandboxEnabled:boolean;scopes:SsoScope[];redirectUris:string[];version:string;ready:boolean;errorCode:string|null};
export type SsoServer={enabled:boolean;issuer:string|null;discovery:string|null;authorizationEndpoint:string|null;tokenEndpoint:string|null;userInfoEndpoint:string|null;jwksUri:string|null;refreshEnabled:boolean};
export type SsoConfiguration={appId:string;ssoEnabled:boolean;appVersion:string;clients:SsoClient[];server:SsoServer};
export type SsoDraft={clientType:'Public'|'Confidential';ssoEnabled:boolean;sandboxEnabled:boolean;scopes:SsoScope[];redirects:string};
const invalid=()=>{throw new Error('Dữ liệu cấu hình SSO không hợp lệ. Hãy tải lại hoặc liên hệ hỗ trợ.');};
const object=(value:unknown,keys:string[]):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const guid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const https=(value:unknown)=>{try{if(typeof value!=='string'||value.length>2048)return false;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.hash;}catch{return false;}};
export function parseSsoConfiguration(value:unknown):SsoConfiguration{
  if(!object(value,['appId','ssoEnabled','appVersion','clients','server'])||typeof value.appId!=='string'||value.appId.length>100||typeof value.ssoEnabled!=='boolean'||!guid(value.appVersion)||!Array.isArray(value.clients)||value.clients.length>2)return invalid();
  const environments=new Set();
  for(const client of value.clients){
    if(!object(client,['clientId','clientType','environment','sandboxEnabled','scopes','redirectUris','version','ready','errorCode'])||
      typeof client.clientId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(client.clientId)||!['Public','Confidential'].includes(String(client.clientType))||typeof client.clientType!=='string'||
      typeof client.environment!=='string'||!['Sandbox','Production'].includes(client.environment)||environments.has(client.environment)||typeof client.sandboxEnabled!=='boolean'||
      !Array.isArray(client.scopes)||client.scopes.length>3||client.scopes.some(s=>!['openid','profile','email'].includes(s))||!Array.isArray(client.redirectUris)||client.redirectUris.length>20||
      client.redirectUris.some(uri=>typeof uri!=='string'||uri.length>1024)||!guid(client.version)||typeof client.ready!=='boolean'||(client.errorCode!==null&&(typeof client.errorCode!=='string'||client.errorCode.length>100)))return invalid();
    environments.add(client.environment);
  }
  const server=value.server;
  if(!object(server,['enabled','issuer','discovery','authorizationEndpoint','tokenEndpoint','userInfoEndpoint','jwksUri','refreshEnabled'])||typeof server.enabled!=='boolean'||typeof server.refreshEnabled!=='boolean')return invalid();
  for(const key of ['issuer','discovery','authorizationEndpoint','tokenEndpoint','userInfoEndpoint','jwksUri']){
    if(server.enabled){if(!https(server[key]))return invalid();if(new URL(server[key] as string).origin!==new URL(server.issuer as string).origin)return invalid();}
    else if(server[key]!==null)return invalid();
  }
  return value as unknown as SsoConfiguration;
}
export function ssoDraft(config:SsoConfiguration,environment:SsoEnvironment):SsoDraft{
  const client=config.clients.find(c=>c.environment===environment);
  return{clientType:client?.clientType??'Public',ssoEnabled:config.ssoEnabled,sandboxEnabled:client?.sandboxEnabled??false,scopes:client?.scopes??['openid','profile'],redirects:client?.redirectUris.join('\n')??''};
}
export function ssoRequest(config:SsoConfiguration,environment:SsoEnvironment,draft:SsoDraft){
  const redirects=draft.redirects.split(/\r?\n/).map(uri=>uri.trim()).filter(Boolean);
  if(!redirects.length||redirects.length>20||redirects.some(uri=>!https(uri)||uri.includes('*'))||!draft.scopes.includes('openid'))throw new Error('Nhập từ 1 đến 20 callback HTTPS chính xác, mỗi dòng một URL.');
  return{clientType:draft.clientType,ssoEnabled:draft.ssoEnabled,sandboxEnabled:environment==='Sandbox'&&draft.sandboxEnabled,scopes:draft.scopes,redirectUris:redirects,appVersion:config.appVersion,clientVersion:config.clients.find(c=>c.environment===environment)?.version??null};
}
export const ssoDiagnostic=(code:string|null)=>({SSO_RUNTIME_DISABLED:'Máy chủ chưa bật SSO.',SSO_DOMAIN_UNVERIFIED:'Domain chưa được xác minh hoặc đã hết hạn.',SSO_CLIENT_UNAVAILABLE:'Kiểm tra trạng thái ứng dụng, nhà phát triển và quyền sử dụng môi trường. Production yêu cầu Published.',SSO_PROJECTION_STALE:'Bản ghi giao thức chưa đồng bộ. Lưu lại cấu hình hoặc liên hệ hỗ trợ.',SSO_REDIRECT_REQUIRED:'Cần ít nhất một callback.',SSO_REDIRECT_INVALID:'Callback cũ chưa đạt yêu cầu HTTPS. Hãy sửa và lưu lại.',SSO_INVALID_SCOPE:'Scope chưa hợp lệ.'}[code??'']??'Cấu hình chưa sẵn sàng. Hãy kiểm tra lại.');
