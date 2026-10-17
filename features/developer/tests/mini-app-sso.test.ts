import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSsoConfiguration,ssoDraft,ssoRequest} from '../lib/mini-app-sso';

const version='12345678-1234-1234-1234-123456789012';
const config={appId:'app_test',ssoEnabled:true,appVersion:version,clients:[{clientId:'mc_test',clientType:'Public',environment:'Sandbox',sandboxEnabled:true,scopes:['openid','profile'],redirectUris:['https://partner.example/callback'],version,ready:false,errorCode:'SSO_DOMAIN_UNVERIFIED'}],server:{enabled:false,issuer:null,discovery:null,authorizationEndpoint:null,tokenEndpoint:null,userInfoEndpoint:null,jwksUri:null,refreshEnabled:false}};
test('SSO data rejects malformed clients and credential injection; environments do not share draft configuration',()=>{
  const parsed=parseSsoConfiguration(config);assert.equal(parsed.clients.length,1);
  for(const changed of [{...config,clientSecret:'leak'},{...config,clients:[{...config.clients[0],environment:['Sandbox']}]},{...config,server:{...config.server,enabled:true,issuer:'javascript:bad'}},{...config,clients:[{...config.clients[0],scopes:['admin']}]},{...config,clients:[{...config.clients[0],clientSecret:'leak'}]}])
    assert.throws(()=>parseSsoConfiguration(changed));
  const production=ssoDraft(parsed,'Production');assert.equal(production.redirects,'');assert.equal(production.clientType,'Public');
  const sandbox=ssoDraft(parsed,'Sandbox');assert.equal(ssoRequest(parsed,'Sandbox',sandbox).clientVersion,version);
  assert.equal(ssoRequest(parsed,'Production',{...production,redirects:'https://production.example/callback'}).clientVersion,null);
  assert.throws(()=>ssoRequest(parsed,'Production',production));
  const legacy=parseSsoConfiguration({...config,clients:[{...config.clients[0],redirectUris:['http://localhost:3000/callback']}]});
  assert.throws(()=>ssoRequest(legacy,'Sandbox',ssoDraft(legacy,'Sandbox')));
});
