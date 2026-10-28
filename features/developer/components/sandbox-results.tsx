import { useCallback, useEffect, useRef, useState } from 'react';
import { sandboxClient, type SandboxCheckKey, type SandboxDiagnosticCategory, type SandboxDiagnosticsPage, type SandboxReadiness,
  type SandboxRunDetail, type SandboxRunSummary, type SandboxSession } from '../lib/mini-app-sandbox';
import { sandboxChecks, sandboxStatuses, sandboxSources, sandboxRemediation, sandboxDiagnosticExport, runActive } from '../lib/sandbox-presentation';

const retiredChecks = new Set<SandboxCheckKey>(['callbacks','ssoClient','discovery','consent','token','userInfo']);
const categories:SandboxDiagnosticCategory[]=['Runtime','Bridge','Configuration','Network','Permission'];
const time=(value:string|null)=>value?new Date(value).toLocaleString('vi-VN'):'Chưa có';

export function SandboxReadinessView({value}:{value:SandboxReadiness|null}){
  if(!value)return <p>Chưa có đánh giá readiness.</p>;
  return <><dl className="sandbox-readiness">
    <div><dt>Cấu hình</dt><dd>{value.configurationReady?'Đã đủ':'Cần bổ sung'}</dd></div>
    <div><dt>Chạy Sandbox</dt><dd>{value.readyForSandbox?'Sẵn sàng':'Chưa sẵn sàng'}</dd></div>
    <div><dt>Gửi xét duyệt</dt><dd>{value.readyForReview?'Đủ bằng chứng':'Chưa đủ bằng chứng'}</dd></div>
  </dl><p className="muted">Đánh giá lúc {time(value.evaluatedAt)}. Readiness không thay đổi trạng thái xuất bản ứng dụng.</p>
    <SandboxChecksView checks={value.checks}/></>;
}
type Check=SandboxReadiness['checks'][number]|SandboxRunDetail['results'][number];
export function SandboxChecksView({checks}:{checks:Check[]}){
  return <div className="sandbox-table-scroll" tabIndex={0} role="region" aria-label="Bảng kết quả kiểm tra"><table className="sandbox-results-table">
    <caption>Kết quả và nguồn bằng chứng</caption><thead><tr><th scope="col">Kiểm tra</th><th scope="col">Kết quả</th><th scope="col">Bằng chứng / hành động</th></tr></thead>
    <tbody>{checks.filter(check=>(!('applicable' in check)||check.applicable)&&(!retiredChecks.has(check.key)||check.evidenceSource==='ServerProtocol')).map(check=><tr key={check.key}><th scope="row">{sandboxChecks[check.key]??'Kiểm tra'}</th>
      <td>{check.messageCode==='CHECK_PENDING'?'Đang chờ':sandboxStatuses[check.status]??'Chưa xác định'}</td>
      <td>{sandboxSources[check.evidenceSource]??'Chưa xác định'} · {time(check.evidenceAt)}
        {(check.status!=='Passed'||check.messageCode==='CHECK_PENDING')&&<p>{sandboxRemediation(check.key,check.messageCode)}</p>}</td></tr>)}</tbody>
  </table></div>;
}
export function SandboxDiagnosticsView({page}:{page:SandboxDiagnosticsPage|null}){
  return <>{page?.droppedCount? <p role="status">{page.droppedCount} sự kiện vượt giới hạn đã được lược bỏ.</p>:null}
    <p className="muted">Host/SDK tự báo cáo chỉ phục vụ chẩn đoán, không xác nhận kiểm thử đạt.</p>
    {!page?.items.length?<p>Chưa có diagnostics trong bộ lọc này.</p>:<ol className="sandbox-diagnostics-list">{page.items.filter(item=>item.category!=='SSO').map(item=><li key={item.id}>
      <span>{item.category} · {item.level} · <code>{item.code}</code></span>
      <span className="muted">{sandboxSources[item.evidenceSource]??'Chưa xác định'} · {time(item.createdAt)}{item.count!==null?` · ${item.count} sự kiện`:''}</span>
    </li>)}</ol>}</>;
}
export function SandboxResults({appId,session}:{appId:string;session:SandboxSession|null}){
  const [readiness,setReadiness]=useState<SandboxReadiness|null>(null),[readinessBusy,setReadinessBusy]=useState(false);
  const [runs,setRuns]=useState<SandboxRunSummary[]>([]),[runCursor,setRunCursor]=useState<string|null>(null),[detail,setDetail]=useState<SandboxRunDetail|null>(null);
  const [checks,setChecks]=useState<SandboxCheckKey[]>((Object.keys(sandboxChecks) as SandboxCheckKey[]).filter(key=>!retiredChecks.has(key)));
  const [page,setPage]=useState<SandboxDiagnosticsPage|null>(null),[category,setCategory]=useState<SandboxDiagnosticCategory|''>('');
  const [busy,setBusy]=useState(false),[diagnosticsBusy,setDiagnosticsBusy]=useState(false),[error,setError]=useState('');
  const [pollFailed,setPollFailed]=useState(false),[pollRetry,setPollRetry]=useState(0);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyFailed,setHistoryFailed]=useState(false),[historyRetry,setHistoryRetry]=useState(0);
  const restoreFocus=useRef(false),pollEpoch=useRef(0);
  const generation=useRef(0),mutation=useRef(false),readinessRequest=useRef(false),diagnosticRequest=useRef(false),startButton=useRef<HTMLButtonElement>(null);
  const refreshReadiness=useCallback(async()=>{
    if(readinessRequest.current)return;const current=generation.current;readinessRequest.current=true;setReadinessBusy(true);
    try{const value=await sandboxClient.readiness(appId);if(current===generation.current)setReadiness(value);}
    catch{if(current===generation.current){setReadiness(null);setError('Không tải được readiness. Kiểm tra lại kết nối và quyền truy cập.');}}
    finally{if(current===generation.current){readinessRequest.current=false;setReadinessBusy(false);}}
  },[appId]);
  useEffect(()=>{
    const scope=++generation.current;readinessRequest.current=false;diagnosticRequest.current=false;mutation.current=false;
    setReadiness(null);setReadinessBusy(false);setDiagnosticsBusy(false);setBusy(false);setDetail(null);setRuns([]);setRunCursor(null);setPage(null);setError('');
    void refreshReadiness();
    setHistoryLoading(!!session);
    setHistoryFailed(false);
    if(session){const current=generation.current;
      void (async()=>{try{
        const value=await sandboxClient.runs(appId,session.id,{order:'newest'});if(current!==generation.current)return;
        setRuns(value.items);setRunCursor(value.nextCursor);
        if(value.items[0]){const latest=await sandboxClient.run(appId,value.items[0].id);if(current===generation.current)setDetail(latest);}
      }catch{if(current===generation.current){setHistoryFailed(true);setError('Không tải được lịch sử lượt chạy. Tải lại lịch sử trước khi chạy kiểm tra.');}}
      finally{if(current===generation.current)setHistoryLoading(false);}})();
    }
    return()=>{generation.current=scope+1;};
  },[appId,session,refreshReadiness,historyRetry]);
  const currentRunId=detail?.run.id,currentRunStatus=detail?.run.status;
  useEffect(()=>{
    if(!currentRunId||!['Queued','Running'].includes(currentRunStatus??''))return;
    let active=true;let timer:ReturnType<typeof setTimeout>;const current=generation.current,runId=currentRunId,epoch=pollEpoch.current;
    setPollFailed(false);
    async function poll(){
      try{const value=await sandboxClient.run(appId,runId);if(!active||current!==generation.current||epoch!==pollEpoch.current)return;
        setDetail(value);setRuns(previous=>[value.run,...previous.filter(x=>x.id!==runId)]);
        if(runActive(value.run))timer=setTimeout(()=>void poll(),2000);else void refreshReadiness();
      }catch{if(active&&current===generation.current){setPollFailed(true);setError('Đã dừng cập nhật kết quả. Nhấn Tải lại kết quả để thử lại.');}}
    }
    timer=setTimeout(()=>void poll(),1000);return()=>{active=false;clearTimeout(timer);};
  },[appId,currentRunId,currentRunStatus,pollRetry,refreshReadiness]);
  const loadDiagnostics=useCallback(async(append=false)=>{
    if(!session||diagnosticRequest.current)return;diagnosticRequest.current=true;setDiagnosticsBusy(true);const current=generation.current;
    try{const value=await sandboxClient.diagnostics(appId,session.id,{category:category||undefined,cursor:append?page?.nextCursor??undefined:undefined,limit:25});
      if(current===generation.current)setPage(previous=>({...value,items:append?[...(previous?.items??[]),...value.items].slice(-200):value.items}));
    }catch{if(current===generation.current)setError('Không tải được diagnostics. Vui lòng thử lại.');}
    finally{if(current===generation.current){diagnosticRequest.current=false;setDiagnosticsBusy(false);}}
  },[appId,session,category,page?.nextCursor]);
  useEffect(()=>{setPage(null);},[session,category]);
  async function createRun(){
    if(!session||historyLoading||historyFailed||!checks.length||mutation.current||runActive(detail?.run))return;const current=generation.current;mutation.current=true;setBusy(true);setError('');
    try{const run=await sandboxClient.createRun(appId,session.id,checks);
      if(current===generation.current){setDetail({run,results:[]});setRuns(previous=>[run,...previous.filter(x=>x.id!==run.id)]);}
      const value=await sandboxClient.run(appId,run.id);
      if(current===generation.current){setDetail(value);setRuns(previous=>[run,...previous.filter(x=>x.id!==run.id)]);}
    }catch{if(current===generation.current)setError('Không tạo được lượt kiểm tra. Tải lại kết quả hoặc mở phiên Sandbox mới.');}
    finally{if(current===generation.current){mutation.current=false;setBusy(false);}}
  }
  async function selectRun(id:string){
    if(mutation.current)return;const current=generation.current;mutation.current=true;setBusy(true);setError('');
    try{const value=await sandboxClient.run(appId,id);if(current===generation.current)setDetail(value);}
    catch{if(current===generation.current)setError('Không tải được kết quả lượt chạy.');}
    finally{if(current===generation.current){mutation.current=false;setBusy(false);}}
  }
  async function cancelRun(){
    if(!detail||mutation.current)return;const current=generation.current;mutation.current=true;pollEpoch.current++;setBusy(true);
    try{await sandboxClient.cancelRun(appId,detail.run.id);const value=await sandboxClient.run(appId,detail.run.id);
      if(current===generation.current){restoreFocus.current=true;setDetail(value);setRuns(previous=>[value.run,...previous.filter(x=>x.id!==value.run.id)]);void refreshReadiness();}
    }catch{if(current===generation.current){setPollFailed(true);setError('Chưa xác nhận hủy lượt kiểm tra. Tải lại kết quả rồi thử lại.');}}
    finally{if(current===generation.current){mutation.current=false;setBusy(false);}}
  }
  async function moreRuns(){
    if(!session||!runCursor||mutation.current)return;const current=generation.current;mutation.current=true;setBusy(true);
    try{const value=await sandboxClient.runs(appId,session.id,{cursor:runCursor,order:'newest'});if(current===generation.current){setRuns(previous=>[...previous,...value.items].slice(0,100));setRunCursor(value.nextCursor);}}
    catch{if(current===generation.current)setError('Không tải được lịch sử tiếp theo.');}
    finally{if(current===generation.current){mutation.current=false;setBusy(false);}}
  }
  function download(){
    const url=URL.createObjectURL(new Blob([sandboxDiagnosticExport(detail,page)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='sandbox-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const active=runActive(detail?.run),done=detail?.results.filter(x=>x.messageCode!=='CHECK_PENDING').length??0;
  useEffect(()=>{if(restoreFocus.current&&!busy&&!active){restoreFocus.current=false;startButton.current?.focus();}},[busy,active]);
  return <div className="sandbox-evidence">
    {error&&<p className="form-error" role="alert">{error}</p>}
    <section aria-labelledby="sandbox-readiness-title"><div className="mini-sandbox-heading"><h2 id="sandbox-readiness-title">Readiness</h2>
      <button className="button button-secondary" disabled={readinessBusy} onClick={()=>{setError('');void refreshReadiness();}}>{readinessBusy?'Đang đánh giá…':'Kiểm tra readiness'}</button></div>
      <div aria-busy={readinessBusy}><SandboxReadinessView value={readiness}/></div>
    </section>
    <section aria-labelledby="sandbox-tests-title"><h2 id="sandbox-tests-title">Kiểm thử Sandbox</h2>
      {!session?<p>Bắt đầu phiên Sandbox để chạy kiểm tra và xem diagnostics.</p>:<>
        <fieldset className="sandbox-check-selection" disabled={busy||active}><legend>Chọn kiểm tra</legend>
          {(Object.entries(sandboxChecks) as [SandboxCheckKey,string][]).filter(([key])=>!retiredChecks.has(key)).map(([key,label])=><label key={key}><input type="checkbox" checked={checks.includes(key)} onChange={e=>setChecks(previous=>e.target.checked?[...previous,key]:previous.filter(x=>x!==key))}/>{label}</label>)}
        </fieldset>
        <div className="mini-sandbox-toolbar"><button ref={startButton} className="button" disabled={historyLoading||historyFailed||busy||active||!checks.length} onClick={()=>void createRun()}>Chạy {checks.length} kiểm tra</button>
          {historyFailed&&<button className="button button-secondary" onClick={()=>setHistoryRetry(value=>value+1)}>Tải lại lịch sử</button>}
          {active&&<button className="button button-secondary" disabled={busy} onClick={()=>void cancelRun()}>Hủy lượt kiểm tra</button>}
          <label>Lịch sử lượt chạy<select disabled={busy||active} value={detail?.run.id??''} onChange={e=>void selectRun(e.target.value)}><option value="" disabled>Chọn lượt chạy</option>
            {runs.map(run=><option key={run.id} value={run.id}>{time(run.createdAt)} · {sandboxStatuses[run.status]}</option>)}</select></label>
          {runCursor&&runs.length<100&&<button className="button button-secondary" disabled={busy} onClick={()=>void moreRuns()}>Thêm lịch sử</button>}
          {detail&&<button className="button button-secondary" disabled={busy||(active&&!pollFailed)} onClick={()=>{setError('');if(active)setPollRetry(value=>value+1);else void selectRun(detail.run.id);}}>Tải lại kết quả</button>}
        </div>
        <p role="status" aria-live="polite">{detail?`${sandboxStatuses[detail.run.status]} · ${done}/${detail.results.length} kiểm tra đã xử lý`:'Chưa có lượt kiểm tra.'}</p>
        {detail&&<p className="sandbox-run-hint">Mã đối chiếu: <code>{detail.run.id}</code><br/>Truyền mã vào tùy chọn <code>sandboxRunId</code> của SDK khi đăng nhập kiểm thử. Mã hết hiệu lực khi lượt chạy kết thúc.</p>}
        {detail&&<><p className="muted">Hoàn tất xử lý không đồng nghĩa tất cả kiểm tra đạt. Readiness dùng bằng chứng mới và cùng cấu hình.</p><SandboxChecksView checks={detail.results}/></>}
      </>}
    </section>
    <section aria-labelledby="sandbox-diagnostics-title"><h2 id="sandbox-diagnostics-title">Diagnostics</h2>
      <div className="mini-sandbox-toolbar"><label>Nhóm sự kiện<select disabled={diagnosticsBusy} value={category} onChange={e=>setCategory(e.target.value as SandboxDiagnosticCategory|'')}><option value="">Tất cả</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
        <button className="button button-secondary" disabled={!session||diagnosticsBusy} onClick={()=>void loadDiagnostics()}>{diagnosticsBusy?'Đang tải…':'Tải diagnostics'}</button>
        <button className="button button-secondary" disabled={!detail&&!page} onClick={download}>Tải báo cáo an toàn</button>
      </div>
      <div aria-busy={diagnosticsBusy}><SandboxDiagnosticsView page={page}/></div>
      {page?.nextCursor&&<button className="button button-secondary" disabled={diagnosticsBusy} onClick={()=>void loadDiagnostics(true)}>Tải trang tiếp theo</button>}
      {(page?.items.length??0)>=200&&<p className="muted">Hiển thị tối đa 200 sự kiện gần nhất đã tải. Đổi bộ lọc để tìm theo nhóm.</p>}
    </section>
  </div>;
}
