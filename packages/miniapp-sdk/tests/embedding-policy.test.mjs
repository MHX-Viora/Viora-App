import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureAncestors, headers} from '../examples/common.mjs';

test('examples deny framing by default and opt in only to exact controlled HTTPS ancestors', () => {
  assert.equal(fixtureAncestors(), "'none'");
  const origins=['https://portal.ankt.localhost:5494','https://sandbox.ankt.localhost:5493'];
  const policy=fixtureAncestors(JSON.stringify(origins));
  const captured=new Map();headers({setHeader:(key,value)=>captured.set(key,value)},"'self'","'self'",policy);
  assert.ok(captured.get('Content-Security-Policy').endsWith('frame-ancestors '+origins.join(' ')));
  for(const value of ['["*"]','["http://localhost"]','["https://user:secret@localhost"]','["https://localhost/path"]','["https://public.example.com"]','null','{}','["https://localhost","https://localhost","https://localhost"]'])
    assert.throws(()=>fixtureAncestors(value), /Invalid fixture/);
});
