const appRoute = /^\/developers\/console\/apps\/app_[A-Za-z0-9_-]{43}(\/sandbox)?\/?$/;
const sandboxRoute = /^\/developers\/console\/apps\/app_[A-Za-z0-9_-]{43}\/sandbox\/?$/;
const docsRoute = /^\/developers\/docs(?:\/|$)/;

export function requiresDeveloperDocumentNavigation(currentPath: string, targetPath: string): boolean {
  // Reload on both sides of the Sandbox CSP boundary and preserve editor unload guards.
  return docsRoute.test(currentPath.split(/[?#]/, 1)[0]) || docsRoute.test(targetPath.split(/[?#]/, 1)[0]) ||
    sandboxRoute.test(currentPath.split(/[?#]/, 1)[0]) || appRoute.test(targetPath.split(/[?#]/, 1)[0]);
}
