import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnktMiniApp, MiniAppAuthError} from '../../../../packages/miniapp-sdk/src/index';
import {pages} from '../lib/manifest';
import {sdkReference} from '../reference/sdk';
import {protocolReference} from '../reference/protocol';
import {readFileSync} from 'node:fs';
import {URL as NodeURL} from 'node:url';
import {VERSION} from '../../../../packages/miniapp-sdk/src/config';
import sdkManifest from '../../../../public/sdk/manifest.json';
test('documented SDK validates origins and requires a trusted Host', async () => {
  const options={apiOrigin:'https://api.example',hostOrigin:'https://host.example',clientId:'app_'+'x'.repeat(43)};
  assert.throws(()=>createAnktMiniApp({...options,hostOrigin:'https://host.example/path'}),MiniAppAuthError);
  await assert.rejects(()=>createAnktMiniApp(options).init(), {code:'HOST_UNAVAILABLE'});
});

test('production onboarding documents partner login without requiring the ANKT workspace or localhost', () => {
  const content=JSON.stringify(pages);
  assert.ok(!/localhost|127\.0\.0\.1|Build SDK từ workspace|cài từ đường dẫn local/.test(content),'public docs must use production onboarding');
  assert.ok(!content.includes('onrender.com'),'public documentation must use the production API domain');
  const quickStart=JSON.stringify(pages.find(page=>page.slug==='getting-started'));
  assert.match(quickStart,/https:\/\/mxh\.ankt\.vn/);
  assert.match(quickStart,/getLoginCode/);
  assert.match(quickStart,/backend|Backend/);
  assert.ok(sdkReference.some(method=>method.name==='ANKT.auth.getLoginCode'));
  for(const path of ['/api/miniapp/auth/code','/api/miniapp/auth/partner/exchange','/api/miniapp/auth/partner/session'])
    assert.ok(protocolReference.some(operation=>operation.path===path),path);
});
test('public docs expose bridge authentication without redirect-login instructions', () => {
  const content=JSON.stringify(pages);
  assert.match(content,/getUserInfo/); assert.match(content,/code_verifier/);
  assert.doesNotMatch(content,/OIDC|OAuth|openid-client|connect\/authorize|ClientSecretBasic/);
});

test('SDK reference covers the shipped runtime and protocol routes match backend registration', () => {
  assert.equal(VERSION,sdkManifest.version);
  for(const method of sdkReference)assert.ok(method.support.includes(VERSION),method.name+' version');
  const sdkReadme=readFileSync(new NodeURL('../../../../packages/miniapp-sdk/README.md',import.meta.url),'utf8');
  assert.ok(sdkReadme.startsWith('# ANKT Mini App SDK '+VERSION));
  const sdk=createAnktMiniApp({clientId:'app_'+'x'.repeat(43)});
  const names=Object.entries(sdk).flatMap(([name,value])=>typeof value==='function'?[`ANKT.${name}`]:Object.keys(value).map(method=>`ANKT.${name}.${method}`));
  assert.deepEqual(sdkReference.map(method=>method.name).sort(),names.sort());
  const api=readFileSync(new NodeURL('../../../../../viora-BE/viora-BE/Developer/MiniAppAuthBridgeApi.cs',import.meta.url),'utf8');
  for(const operation of protocolReference){
    const method=operation.method[0]+operation.method.slice(1).toLowerCase();
    const suffix=operation.path.replace('/api/miniapp/auth','');
    assert.ok(api.includes(`Map${method}("${suffix}"`),operation.path);
  }
});

test('partner environment recipes agree across frontend, server and .NET adapters', () => {
  const setup=pages.find(page=>page.slug==='environment-setup');
  assert.ok(setup);
  function env(sectionId:string){
    const block=setup!.sections.find(section=>section.id===sectionId)?.blocks.find(block=>block.type==='code'&&block.language==='bash');
    assert.ok(block?.type==='code');
    return Object.fromEntries(block.code.split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
  }
  const frontend=env('frontend'),backend=env('backend'),dotnet=env('dotnet');
  assert.equal(frontend.EXPO_PUBLIC_ANKT_API_ORIGIN,'https://api.mxh.ankt.vn');
  assert.equal(frontend.EXPO_PUBLIC_ANKT_API_ORIGIN,backend.ANKT_API_ORIGIN);
  assert.equal(frontend.EXPO_PUBLIC_ANKT_API_ORIGIN,dotnet.AnktMiniApp__ApiOrigin);
  assert.equal(frontend.EXPO_PUBLIC_ANKT_CLIENT_ID,backend.ANKT_MINI_APP_CLIENT_ID);
  assert.equal(frontend.EXPO_PUBLIC_ANKT_CLIENT_ID,dotnet.AnktMiniApp__ClientId);
  assert.equal(frontend.EXPO_PUBLIC_ANKT_HOST_ORIGIN,dotnet.AnktMiniApp__HostOrigin);
  assert.equal(backend.MINI_APP_ORIGIN,dotnet.AnktMiniApp__MiniAppOrigin);
  assert.equal(backend.ANKT_MINI_APP_ENVIRONMENT,'Production');
  assert.equal(dotnet.AnktMiniApp__Environment,'Production');
  assert.ok(!Object.keys(frontend).some(key=>key.includes('SECRET')));
});
