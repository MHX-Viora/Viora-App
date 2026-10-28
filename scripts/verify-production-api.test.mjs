import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

test('production guard checks current app/SDK and permits immutable SDK archives',()=>{
  const root=mkdtempSync(join(tmpdir(),'ankt-api-origin-'));
  const check=()=>spawnSync(process.execPath,['scripts/verify-production-api.mjs',root],{encoding:'utf8'}).status;
  try{
    mkdirSync(join(root,'sdk'));
    writeFileSync(join(root,'app.js'),'https://api.mxh.ankt.vn');
    writeFileSync(join(root,'sdk/manifest.json'),JSON.stringify({filename:'ankt-miniapp.v0.4.1.min.js'}));
    writeFileSync(join(root,'sdk/ankt-miniapp.v0.4.1.min.js'),'https://api.mxh.ankt.vn');
    writeFileSync(join(root,'sdk/ankt-miniapp.js'),'https://api.mxh.ankt.vn');
    writeFileSync(join(root,'sdk/ankt-miniapp.v0.3.0.min.js'),'https://viora-back-end-xmco.onrender.com');
    assert.equal(check(),0);
    writeFileSync(join(root,'sdk/ankt-miniapp.js'),'https://viora-back-end-xmco.onrender.com');
    assert.notEqual(check(),0);
    writeFileSync(join(root,'sdk/ankt-miniapp.js'),'https://api.mxh.ankt.vn');
    writeFileSync(join(root,'sdk/ankt-miniapp.v0.4.1.min.js'),'https://viora-back-end-xmco.onrender.com');
    assert.notEqual(check(),0);
    writeFileSync(join(root,'sdk/ankt-miniapp.v0.4.1.min.js'),'https://api.mxh.ankt.vn');
    writeFileSync(join(root,'app.js'),'https://viora-back-end-xmco.onrender.com');
    assert.notEqual(check(),0);
  }finally{rmSync(root,{recursive:true,force:true});}
});
