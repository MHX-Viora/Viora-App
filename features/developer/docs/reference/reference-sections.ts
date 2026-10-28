import type { DocBlock, DocSection } from '../lib/content-schema';
import { apiInventory } from './api-inventory';
import rawSchemas from './dto-schemas.json';
import semanticFields from './request-fields.json';
import { protocolReference } from './protocol';
type Field = { type: string; jsonRequired: boolean; validationRequired: boolean; minLength: number | null; maxLength: number | null };
const schemas = rawSchemas as Record<string, Record<string, Field>>;
const semantic = semanticFields as Record<string, Record<string, string>>;
const rateDescriptions: Record<string, string> = {
  'developer-auth': 'Mặc định 60 request/phút anonymous, 180 request/phút khi đã xác thực Developer.',
  'mini-app-sensitive': '20 request/phút theo policy thao tác nhạy cảm.',
  'mini-app-verification': '10 request/phút cho kiểm tra/xác minh.',
  'mini-app-review-read': 'Mặc định 120 request/phút; môi trường có thể cấu hình khác.',
  'mini-app-review-write': 'Mặc định 30 request/phút; môi trường có thể cấu hình khác.',
  'mini-app-sandbox': '60 request/phút cho quản lý Sandbox.',
  'mini-app-public-read': 'Mặc định 120 request/phút; môi trường có thể cấu hình khác.',
};
function example(name: string, depth = 0): unknown {
  const base = name.replace(/ \| null$/, '');
  if (name.includes(' | null')) return null;
  if (base.endsWith('[]')) return [];
  if (base === 'boolean') return false;
  if (base === 'number') return 1;
  if (base === 'UUID') return '11111111-1111-4111-8111-111111111111';
  if (base === 'ISO 8601 datetime') return '2026-10-23T00:00:00Z';
  if (schemas[base] && depth < 3) return Object.fromEntries(Object.entries(schemas[base]).map(([key, value]) => [key, example(value.type, depth + 1)]));
  return 'PLACEHOLDER';
}
function fields(name: string): DocBlock[] {
  const type = name.replace('[]', '');
  if (!schemas[type]) return [{ type: 'paragraph', text: name }];
  return [{ type: 'table', columns: ['Field', 'Kiểu JSON / ý nghĩa', 'Validation metadata'], rows: Object.entries(schemas[type]).map(([key, value]) => [key,
    semantic[type]?.[key] || value.type, [value.jsonRequired ? 'JSON required' : '', value.validationRequired ? 'Required validation' : '', value.maxLength ? `${value.minLength ?? 0}–${value.maxLength} ký tự` : ''].filter(Boolean).join('; ') || 'Xem validation nghiệp vụ và trạng thái ở hướng dẫn liên quan']) }];
}
export const referenceSections: DocSection[] = apiInventory.map(endpoint => {
  const browser = endpoint.group === 'account', anonymous = endpoint.group === 'catalog';
  const body = endpoint.request && schemas[endpoint.request] ? JSON.stringify(example(endpoint.request), null, 2) : undefined;
  const query = endpoint.id === 'publishing-readiness' ? '?versionId=11111111-1111-4111-8111-111111111111' :
    endpoint.group === 'sandbox' && endpoint.query ? '?sessionId=11111111-1111-4111-8111-111111111111&limit=20' :
    endpoint.query ? endpoint.id === 'apps-list' ? '?page=1' : '?page=1&pageSize=20' : '';
  const payload = endpoint.bodyFormat ? 'Content-Type: image/png\n\n[BINARY_IMAGE_BYTES_PLACEHOLDER]' : body ? 'Content-Type: application/json\n\n' + body : '';
  const request = `${endpoint.method} ${endpoint.path}${query} HTTP/1.1\nHost: ${browser ? 'YOUR_PORTAL_HOST' : 'YOUR_API_HOST'}\n${anonymous ? '' : browser ? 'X-ANKT-Developer: 1\n' : 'Authorization: DeveloperSession BACKEND_SESSION_PLACEHOLDER\n'}${payload}`;
  const blocks: DocBlock[] = [
    { type: 'paragraph', text: endpoint.description },
    { type: 'table', columns: ['Thuộc tính', 'Hợp đồng'], rows: [
      ['Authentication', anonymous ? 'Anonymous read; runtime feature cần được bật' : browser ? 'BFF same-origin; cookie Developer cho các thao tác cần phiên; auth đăng ký/login/khôi phục cho phép anonymous' : 'DeveloperSession chủ sở hữu; không dùng Social JWT'],
      ['Path parameters', endpoint.path.includes('{') ? 'appId: app_ + 43 ký tự base64url; các ID version/review/session/run là UUID. environment phải khớp môi trường đã xác minh của phiên.' : 'Không có.'],
      ['Query', endpoint.query || 'Không có tham số được mô tả cho thao tác này.'],
      ['Body format', endpoint.bodyFormat || (endpoint.request ? 'application/json; schema bên dưới' : 'Không có body theo contract; không thêm trường tùy ý.')],
      ['Success', String(endpoint.success) + (endpoint.success === 204 ? ' No Content' : ' — response schema bên dưới')], ['Rate limits', rateDescriptions[endpoint.rate] || 'Theo policy môi trường.'],
    ] },
  ];
  if (endpoint.request) blocks.push({ type: 'paragraph', text: `Request: ${endpoint.request}` }, ...fields(endpoint.request));
  blocks.push({ type: 'code', language: 'http', code: request, caption: 'Ví dụ cấu trúc với placeholder. Revision/ID phải lấy từ dữ liệu hiện tại; không gửi nguyên ví dụ. BFF cookie do browser quản lý, không copy từ JavaScript.' });
  if (endpoint.response) {
    blocks.push({ type: 'paragraph', text: `Response: ${endpoint.response}` }, ...fields(endpoint.response));
    const response = schemas[endpoint.response.replace('[]', '')] ? (endpoint.response.endsWith('[]') ? [example(endpoint.response.slice(0, -2))] : example(endpoint.response)) : undefined;
    if (response) blocks.push({ type: 'code', language: 'json', code: JSON.stringify(response, null, 2), caption: 'Dữ liệu tổng hợp minh họa schema, không phải app/account thật. Null/empty chỉ minh họa kiểu, không thay validation nghiệp vụ.' });
  }
  blocks.push({ type: 'code', language: 'json', code: JSON.stringify({ error: { code: endpoint.group === 'catalog' ? 'APP_NOT_FOUND' : 'VALIDATION_ERROR', message: 'Thông báo lỗi an toàn do API trả về.' } }, null, 2), caption: 'Ví dụ envelope lỗi. Xem điều kiện HTTP/error code thực trong phần lỗi và hướng dẫn; không phải mọi endpoint đều phát sinh mọi mã.' });
  return { id: endpoint.id, title: `${endpoint.method} ${endpoint.path}`, level: 3, blocks };
});
export const protocolSections: DocSection[] = protocolReference.map(entry => ({ id: `auth-${entry.id}`, title: `${entry.method} ${entry.path}`, level: 3,
  blocks: [{ type: 'paragraph', text: entry.description }, { type: 'table', columns: ['Thuộc tính', 'Hợp đồng'], rows: [['Authentication', entry.authentication], ['Request', entry.request], ['Response', entry.response], ['HTTP / errors', entry.status], ['Rate limits', 'Theo deployment/issuer policy; không có cam kết reset header trong reference này.']] },
    { type: 'code', language: 'http', code: entry.example, caption: entry.id.startsWith('partner-') ? 'Ví dụ server-to-server với placeholder; credential chỉ ở backend. Không copy Origin hoặc Authorization của browser sang request này.' : 'Wire protocol tham khảo. Frontend dùng SDK Auth Bridge; không gửi token hoặc mã thật vào trang tài liệu.' }] }));
