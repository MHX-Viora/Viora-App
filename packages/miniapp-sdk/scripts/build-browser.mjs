import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),publicRoot=new URL('../../public/sdk/',root);
const {version,sdkReleasedAt}=JSON.parse(await readFile(new URL('package.json',root),'utf8')),filename=`ankt-miniapp.v${version}.min.js`;
if(!/^\d{4}-\d{2}-\d{2}$/.test(sdkReleasedAt))throw Error('SDK release date is required.');
const result=await build({entryPoints:[fileURLToPath(new URL('src/browser.ts',root))],bundle:true,write:false,
  format:'iife',globalName:'ANKTMiniApp',platform:'browser',target:['es2020'],minify:true,sourcemap:false,
  legalComments:'none',banner:{js:`/* ANKT Mini App SDK ${version} */`}});
const bytes=result.outputFiles[0].contents,hash=createHash('sha256').update(bytes).digest('hex');
await mkdir(publicRoot,{recursive:true});
const artifact=new URL(filename,publicRoot);
let previous;
try{previous=await readFile(artifact);}catch(error){if(error.code!=='ENOENT')throw error;}
if(previous&&!previous.equals(Buffer.from(bytes)))throw Error('Version already built with different content; increment SDK version.');
await writeFile(artifact,bytes);
await writeFile(new URL('ankt-miniapp.js',publicRoot),bytes);
await writeFile(new URL('manifest.json',publicRoot),JSON.stringify({version,filename,url:'/sdk/'+filename,bytes:bytes.length,sha256:hash,releasedAt:sdkReleasedAt},null,2)+'\n');
await writeFile(new URL('dist/ankt-miniapp.js',root),bytes);
const demo=new URL('../../miniapp-demo/',root);await mkdir(demo,{recursive:true});
await copyFile(artifact,new URL('ankt-miniapp.js',demo));
console.log(JSON.stringify({version,filename,bytes:bytes.length,sha256:hash}));
