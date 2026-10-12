import { authenticatedFetch } from '@/services/authenticated-fetch';
import type { AppDetail, Banner, CatalogPage, Category, Launch, Rail } from './types';

export async function platformRequest<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal, extraHeaders?: Record<string, string>): Promise<T> {
  const response = await authenticatedFetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}${path}`, {
    method, signal, headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { throw new Error('Máy chủ trả về dữ liệu không hợp lệ.'); }
  if (!response.ok) throw Object.assign(new Error(data?.error?.message ?? data?.message ?? 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'), { code: data?.error?.code ?? data?.code, status: response.status });
  return data as T;
}
export const miniAppsApi = {
  catalog: (rail: Rail, search: string, categoryId: string | undefined, page: number, signal?: AbortSignal) => {
    const query = new URLSearchParams({ rail, search, page: String(page), pageSize: '24' });
    if (categoryId) query.set('categoryId', categoryId);
    return platformRequest<CatalogPage>(`/api/mini-apps/catalog?${query}`, 'GET', undefined, signal);
  },
  categories: () => platformRequest<Category[]>('/api/mini-apps/categories'),
  banners: () => platformRequest<Banner[]>('/api/mini-apps/banners'),
  detail: (id: string) => platformRequest<AppDetail>(`/api/mini-apps/${encodeURIComponent(id)}`),
  favorite: (id: string, favorite: boolean) => platformRequest<void>(`/api/mini-apps/${encodeURIComponent(id)}/favorite`, 'PUT', { favorite }),
  reorder: (appIds: string[]) => platformRequest<void>('/api/mini-apps/favorites/order', 'PUT', { appIds }),
  clearHistory: () => platformRequest<void>('/api/mini-apps/history', 'DELETE'),
  launch: (id: string) => platformRequest<Launch>(`/api/mini-apps/${encodeURIComponent(id)}/launch`, 'POST'),
  close: (id: string, launch: Launch) => platformRequest<void>(`/api/mini-apps/${encodeURIComponent(id)}/sessions/close`, 'POST', { sessionId: launch.sessionId, sessionToken: launch.sessionToken }),
  report: (id: string, reason: string) => platformRequest<void>(`/api/mini-apps/${encodeURIComponent(id)}/reports`, 'POST', { reason }),
};
