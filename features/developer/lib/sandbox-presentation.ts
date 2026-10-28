import type { SandboxCheckKey, SandboxDiagnosticsPage, SandboxRunDetail, SandboxRunSummary } from './mini-app-sandbox';

export const sandboxChecks: Record<SandboxCheckKey,string> = {
  logo:'Logo',name:'Tên ứng dụng',category:'Danh mục',description:'Mô tả',website:'Website',domain:'Domain đã xác minh',
  supportEmail:'Email hỗ trợ',callbacks:'Kiểm tra cấu hình cũ',privacyPolicy:'Chính sách riêng tư',termsOfService:'Điều khoản',
  environment:'Môi trường Sandbox',ssoClient:'Đăng ký Auth Bridge',discovery:'Kiểm tra giao thức cũ',runtime:'Website thực thi',
  bridge:'SDK bridge',consent:'Quyền ứng dụng',token:'Đổi mã Auth Bridge',userInfo:'UserInfo',
};
export const sandboxStatuses: Record<string,string> = {
  Queued:'Đang chờ',Running:'Đang chạy',Completed:'Đã hoàn tất',Cancelled:'Đã hủy',Failed:'Không đạt',
  Passed:'Đạt',Warning:'Cần kiểm tra',Skipped:'Bỏ qua',NotImplemented:'Chưa hỗ trợ',
};
export const sandboxSources: Record<string,string> = {
  Server:'Máy chủ',ServerProtocol:'Giao thức máy chủ',TrustedBrowser:'Trình duyệt kiểm thử tin cậy',
  HostReported:'Host tự báo cáo',SdkReported:'SDK tự báo cáo',
};
export const runActive=(run:SandboxRunSummary|null|undefined)=>run?.status==='Queued'||run?.status==='Running';
export function sandboxRemediation(key:SandboxCheckKey,code:string){
  if(code==='CHECK_PENDING')return 'Đang chờ kiểm tra.';
  if(code==='CHECK_NOT_APPLICABLE')return 'Không áp dụng với cấu hình hiện tại.';
  if(code==='EXECUTOR_UNAVAILABLE')return 'Executor chưa được cấu hình. Liên hệ quản trị viên.';
  if(key==='runtime'||key==='bridge')return 'Kiểm tra SDK, CSP frame-ancestors và khả năng nhúng iframe; chạy lại kiểm thử.';
  if(key==='consent'||key==='token'||key==='userInfo')return 'Thực hiện đăng nhập Sandbox trong lượt chạy hiện tại rồi chạy lại kiểm tra readiness.';
  return 'Cập nhật cấu hình trong trang ứng dụng, rồi kiểm tra lại.';
}
// Explicit allowlist: no arbitrary server fields, URLs, credential or browser payload.
export function sandboxDiagnosticExport(detail:SandboxRunDetail|null,page:SandboxDiagnosticsPage|null){
  return JSON.stringify({environment:'Sandbox',
    run:detail?{status:detail.run.status,checks:detail.results.map(x=>({key:x.key,status:x.status,code:x.messageCode,source:x.evidenceSource,at:x.evidenceAt}))}:null,
    diagnostics:(page?.items??[]).map(x=>({category:x.category,level:x.level,code:x.code,source:x.evidenceSource,at:x.createdAt,count:x.count})),
    droppedCount:page?.droppedCount??0},null,2);
}
