import assert from 'node:assert/strict';
import test from 'node:test';
import { validateOptions, SdkError, VERSION } from '../dist/index.js';

const valid = { issuer: 'https://issuer.example/', clientId: 'public-sdk-client', redirectUri: 'https://partner.example/callback' };
test('configuration is explicit, immutable and cannot carry client secrets', () => {
  assert.equal(VERSION, '0.1.0');
  const config = validateOptions(valid);
  assert.equal(config.scope, 'openid profile'); assert.ok(Object.isFrozen(config));
  for (const changes of [
    {issuer:'http://issuer.example'}, {issuer:'https://user:pass@issuer.example'},
    {redirectUri:'https://partner.example/callback#access_token=x'}, {redirectUri:'https://partner.example/callback?foo=bar'},
    {clientId:''}, {scope:'openid admin'}, {scope:'profile'}, {timeoutMs:0}, {timeoutMs:60001},
    {clientSecret:'secret'}, {client_secret:'secret'}, {unexpected:true},
  ]) assert.throws(() => validateOptions({...valid,...changes}), e => e instanceof SdkError && e.code === 'INVALID_CONFIG' && !e.message.includes('secret'));
});
