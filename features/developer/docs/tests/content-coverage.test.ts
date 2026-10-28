import test from 'node:test';
import assert from 'node:assert/strict';
import {pages} from '../lib/manifest';
import {validateDocuments} from '../lib/content-schema';
test('bridge documentation covers registration, domain, SDK, Sandbox and Production',()=>{
 assert.doesNotThrow(()=>validateDocuments(pages));
 for(const slug of ['getting-started','create-mini-app','domain-verification','environment-setup','auth-bridge','sdk','bridge','sandbox','review','publishing','troubleshooting']) assert.ok(pages.some(page=>page.slug===slug),slug);
 const sdk=JSON.stringify(pages.find(page=>page.slug==='sdk')); assert.match(sdk,/ankt-miniapp\.js/); assert.match(sdk,/ANKTMiniApp\.create/); assert.doesNotMatch(sdk,/npm install \/path\/to/);
 assert.ok(!pages.some(page=>['oauth','oidc','public-client','confidential-client','client-credentials'].includes(page.slug)));
});
