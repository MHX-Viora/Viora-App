import assert from 'node:assert/strict';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path'; import os from 'node:os'; import https from 'node:https';
import type { DomainVerification, ConfigurationReadiness } from '../lib/mini-app-integration';

type Api=(path:string,method?:string,body?:unknown)=>Promise<Response>;
export async function runDomainVerificationE2E(api:Api,appId:string) {
  const base=path.join(os.tmpdir(),'ankt-domain-e2e');
  const entries=await Promise.all((await readdir(base,{withFileTypes:true})).filter(e=>e.isDirectory()&&/^[a-f0-9]{32}$/.test(e.name)).map(async e=>({directory:path.join(base,e.name),time:(await stat(path.join(base,e.name))).mtimeMs})));
  const directory=entries.sort((a,b)=>b.time-a.time)[0]?.directory; assert.ok(directory,'controlled HTTPS fixture is running');
  assert.equal(path.dirname(path.resolve(directory)),path.resolve(base));
  const fixture:{hostname:string;alternateHostname:string;port:number}=JSON.parse(await readFile(path.join(directory,'fixture.json'),'utf8'));
  const root=`mini-apps/${appId}`;
  const configuration={websiteUrl:`https://${fixture.hostname}/app`,supportEmail:'support@example.com',shortDescription:'Controlled E2E Mini App',description:'Persisted integration configuration with actual HTTPS file verification.',privacyPolicyUrl:`https://${fixture.hostname}/privacy`,termsOfServiceUrl:`https://${fixture.hostname}/terms`,ssoEnabled:true,redirectUris:[`https://${fixture.hostname}/callback`]};
  assert.equal((await api(root+'/integration','PUT',configuration)).status,200);
  const loaded=await (await api(root+'/integration')).json(); assert.equal(loaded.websiteUrl,configuration.websiteUrl); assert.deepEqual(loaded.redirectUris,configuration.redirectUris);
  const download=await api(root+'/domain-verification/file'); assert.equal(download.status,200);assert.match(download.headers.get('cache-control')??'',/no-store/);
  const filename=download.headers.get('content-disposition')?.match(/filename="?(ankt-verify-[a-f0-9]{32}\.txt)"?/i)?.[1];assert.ok(filename);
  const content=await download.text(); assert.ok(!content.includes('cs_')); assert.ok(content.includes('app_id='+appId));
  const before=await api(root+'/domain-verification/verify','POST'); assert.equal(before.status,200); assert.equal((await before.json()).errorCode,'FILE_NOT_FOUND');
  // Install the real downloaded file at this test website's public root, with its original bytes/name.
  await writeFile(path.join(directory,filename),content,{encoding:'utf8',flag:'wx'});
  const ca=await readFile(path.join(directory,'root-ca.pem'));
  const direct=await new Promise<string>((resolve,reject)=>{
    const request=https.get({hostname:'127.0.0.1',port:fixture.port,path:'/'+filename,servername:fixture.hostname,ca,rejectUnauthorized:true,headers:{Host:fixture.hostname}},response=>{
      const chunks:Buffer[]=[];response.on('data',chunk=>chunks.push(Buffer.from(chunk)));response.on('end',()=>{assert.equal(response.statusCode,200);resolve(Buffer.concat(chunks).toString('utf8'));});
    });request.on('error',reject);
  });assert.equal(direct,content);
  const verified=await api(root+'/domain-verification/verify','POST');assert.equal(verified.status,200); const result:DomainVerification=await verified.json();assert.equal(result.status,'Verified');assert.ok(result.verifiedAt);
  const reload:DomainVerification=await (await api(root+'/domain-verification')).json();assert.equal(reload.status,'Verified');
  const readyResponse=await api(root+'/readiness'); assert.equal(readyResponse.status,200); const ready:ConfigurationReadiness=await readyResponse.json();assert.equal(ready.configurationReady,true);assert.equal(ready.readyForSandbox,false);assert.equal(ready.readyForReview,false);
  assert.equal((await api(root+'/integration','PUT',{...configuration,websiteUrl:`https://${fixture.alternateHostname}/app`})).status,200);
  const changed:DomainVerification=await (await api(root+'/domain-verification')).json();assert.equal(changed.status,'Pending');assert.equal(changed.hostname,fixture.alternateHostname);assert.notEqual(changed.fileName,filename);
  const notReady:ConfigurationReadiness=await (await api(root+'/readiness')).json();assert.equal(notReady.configurationReady,false);assert.equal(notReady.checks.find(c=>c.key==='domain')?.status,'failed');
  console.log('Controlled HTTPS Stage 4 E2E passed: persisted integration, file root, TLS verification, hostname invalidation and readiness. Real public-domain E2E remains unverified.');
}
