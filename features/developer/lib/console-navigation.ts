export function consoleActiveItem(pathname: string): 'overview' | 'apps' | 'notifications' | null {
  const path = pathname.replace(/^\/developers/, '').replace(/\/$/, '');
  if (path === '/console') return 'overview';
  if (/^\/console\/apps(?:\/|$)/.test(path)) return 'apps';
  return path === '/console/notifications' ? 'notifications' : null;
}
