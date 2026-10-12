import { pages } from './content.mjs';
export const isPublicDeveloperPath = path => typeof path === 'string' && pages.some(page => page.path === path.replace(/\/$/, ''));
export function safeDeveloperReturn(value) {
  return typeof value === 'string' && /^\/developers\/(?:register|console(?:\/(?:credentials|analytics|authorize|apps(?:\/[A-Za-z0-9_-]{1,80})?))?)$/.test(value) ? value : null;
}
