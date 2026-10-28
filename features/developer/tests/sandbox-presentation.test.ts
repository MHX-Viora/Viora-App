import test from 'node:test';
import assert from 'node:assert/strict';
import { sandboxChecks, sandboxDiagnosticExport, runActive, sandboxRemediation } from '../lib/sandbox-presentation';
import type { SandboxDiagnosticsPage, SandboxRunDetail } from '../lib/mini-app-sandbox';

test('completed processing and self-reported diagnostics never imply test success',()=>{
  assert.equal(Object.keys(sandboxChecks).length,18);
  assert.equal(runActive({status:'Completed'} as SandboxRunDetail['run']),false);
  assert.equal(runActive({status:'Running'} as SandboxRunDetail['run']),true);
  assert.match(sandboxRemediation('runtime','EXECUTOR_UNAVAILABLE'),/chưa được cấu hình/);
  assert.match(sandboxRemediation('token','MISSING_EVIDENCE'),/lượt chạy hiện tại/);
});
test('shareable export excludes injected credentials, URLs, payloads and internal identifiers',()=>{
  const row={id:'private-id',sessionId:'private-session',testRunId:'private-run',category:'Bridge',level:'Info',code:'BRIDGE_READY',evidenceSource:'HostReported',createdAt:'2026-10-20T00:00:00Z',count:1,token:'secret',url:'https://example.com/?code=secret',payload:'secret'};
  const exported=sandboxDiagnosticExport(null,{items:[row],nextCursor:'private-cursor',droppedCount:2} as SandboxDiagnosticsPage);
  for(const secret of ['secret','private-','https://'])assert.ok(!exported.includes(secret));
  assert.equal(JSON.parse(exported).diagnostics[0].source,'HostReported');
  assert.equal(JSON.parse(exported).droppedCount,2);
});
