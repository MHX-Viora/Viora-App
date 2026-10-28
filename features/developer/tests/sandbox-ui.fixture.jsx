// UI-only fixture. All API responses below are deterministic samples, never acceptance of real Auth Bridge/Portal authentication.
import { createRoot } from 'react-dom/client';
import { SandboxResults } from '../components/sandbox-results';
import { MiniAppDirectTest } from '../components/mini-app-direct-test';
import '../developer.css';
import '../components/mini-app-sandbox.css';
const appId='app_'+'u'.repeat(43),sessionId='11111111-1111-4111-8111-111111111111',runId='22222222-2222-4222-8222-222222222222';
const now=new Date().toISOString(),fingerprint='A'.repeat(64),keys=['runtime','bridge','token'];
let run=null,polls=0;
const results=()=>keys.map(key=>({key,status:run?.status==='Completed'?(key==='runtime'?'Passed':'Skipped'):'Skipped',messageCode:run?.status==='Running'?'CHECK_PENDING':'MISSING_EVIDENCE',evidenceSource:key==='runtime'?'TrustedBrowser':'Server',evidenceAt:key==='runtime'?now:null,durationMs:0}));
window.fetch=async(input,init)=>{
  const url=new URL(String(input),location.origin),method=init?.method??'GET';
  if(url.pathname.endsWith('/readiness'))return Response.json({environment:'Sandbox',configurationFingerprint:fingerprint,configurationReady:true,readyForSandbox:true,readyForReview:false,evaluatedAt:now,checks:results().map(x=>({...x,applicable:true})),blockingIssues:['bridge','token'],warnings:[]});
  if(url.pathname.endsWith('/test-runs')&&method==='POST'){
    run={id:runId,sessionId,environment:'Sandbox',configurationFingerprint:fingerprint,status:'Running',summaryCode:'RUN_STARTED',createdAt:now,deadlineAt:new Date(Date.now()+120000).toISOString(),startedAt:now,completedAt:null};polls=0;return Response.json(run);
  }
  if(url.pathname.endsWith('/test-runs'))return Response.json({items:run?[run]:[],nextCursor:null});
  if(url.pathname.endsWith('/'+runId)){
    if(method==='DELETE'){run={...run,status:'Cancelled',completedAt:now};return new Response(null,{status:204});}
    if(run.status==='Running'&&++polls>=3)run={...run,status:'Completed',completedAt:now};
    return Response.json({run,results:results()});
  }
  if(url.pathname.endsWith('/diagnostics'))return Response.json({items:[{id:url.searchParams.get('cursor')?'last':'first',sessionId,testRunId:runId,category:url.searchParams.get('category')||'Bridge',level:'Warning',code:'BRIDGE_READY',evidenceSource:'HostReported',createdAt:now,count:1}],nextCursor:url.searchParams.get('cursor')?null:'a'.repeat(32),droppedCount:2});
  return Response.json({error:{message:'Fixture route unavailable'}},{status:404});
};
createRoot(document.getElementById('root')).render(<div className="developer-site"><main className="mini-sandbox" style={{maxWidth:1100,margin:'auto',padding:20}}>
  <p>Fixture giao diện · dữ liệu mẫu, không xác nhận Auth Bridge hay đăng nhập Portal</p><h1>Kiểm thử Sandbox</h1>
  {new URLSearchParams(location.search).has('direct')?<MiniAppDirectTest app={{appId,name:'Demo',websiteUrl:'https://partner.example/app'}}/>:<SandboxResults appId={appId} session={{id:sessionId,appId,environment:'Sandbox',createdAt:now,expiresAt:new Date(Date.now()+900000).toISOString(),revokedAt:null,lastActivityAt:now,configurationFingerprint:fingerprint}}/>}
</main></div>);
