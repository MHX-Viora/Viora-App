const test=require('node:test');
const assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const {resolve}=require('node:path');
const Module=require('node:module');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const filename=resolve(__dirname,'../../features/developer/components/sandbox-results.tsx');
const built=buildSync({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',packages:'external'});
const compiled=new Module(filename,module);compiled.filename=filename;compiled.paths=module.paths;compiled._compile(built.outputFiles[0].text,filename);
const {SandboxDiagnosticsView,SandboxReadinessView}=compiled.exports;
test('diagnostic values render as escaped text and self-reporting never becomes trusted readiness',()=>{
  const html=renderToStaticMarkup(React.createElement(SandboxDiagnosticsView,{page:{items:[{id:'fixture',code:'<img src=x onerror=alert(1)>',category:'Bridge',level:'Info',evidenceSource:'HostReported',createdAt:'2026-10-20T00:00:00Z',count:null}],nextCursor:null,droppedCount:1}}));
  assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('Host tự báo cáo'));assert.ok(html.includes('không xác nhận kiểm thử đạt'));
  const readiness=renderToStaticMarkup(React.createElement(SandboxReadinessView,{value:{configurationReady:true,readyForSandbox:true,readyForReview:false,evaluatedAt:'2026-10-20T00:00:00Z',checks:[]}}));
  assert.ok(readiness.includes('Chưa đủ bằng chứng'));assert.ok(readiness.includes('không thay đổi trạng thái xuất bản'));
});
