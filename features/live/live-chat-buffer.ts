export const LIVE_CHAT_DISPLAY_LIMIT = 100;
export const LIVE_CHAT_DELETED_ID_LIMIT = 200;

export function rememberDeletedComment(ids: Set<string>, id: string): void {
  ids.add(id);
  if (ids.size > LIVE_CHAT_DELETED_ID_LIMIT) ids.delete(ids.values().next().value!);
}

export function mergeLiveChat<T extends { id: string; createdAt?: string }>(current: T[], incoming: T[], limit = LIVE_CHAT_DISPLAY_LIMIT): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const item of [...current, ...incoming]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  // Join snapshots and live events may arrive in either order.
  merged.sort((a, b) => (a.createdAt && b.createdAt ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : 0));
  return merged.slice(-limit);
}
