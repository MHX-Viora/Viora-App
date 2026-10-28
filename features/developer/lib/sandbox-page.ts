import { AccountApiError, accountRequest } from './account-client';
import type { MiniApp } from './mini-app-client';
import { sandboxClient } from './mini-app-sandbox';

export async function loadSandboxPage(appId: string) {
  const app = await accountRequest<MiniApp>(`mini-apps/${appId}`);
  try {
    return { app, config: await sandboxClient.config(appId) };
  } catch (error) {
    if (error instanceof AccountApiError && error.status === 503 && error.code === 'SANDBOX_DISABLED')
      return { app, config: null };
    throw error;
  }
}

export function directTestUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password ||
      /^(localhost|127\.|0\.|\[)/i.test(url.hostname) || /\.(localhost|local)$/i.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}
