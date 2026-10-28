import { router as expoRouter, usePathname as expoPathname, type Href } from "expo-router";
import { useCallback, useMemo, type AnchorHTMLAttributes } from "react";
import { useDeveloperSession } from "./session.web";
import { requiresDeveloperDocumentNavigation } from './lib/navigation-policy';

function developerPath(path: string) {
  return path.startsWith("/developers") || !path.startsWith("/") ? path : `/developers${path === "/" ? "" : path}`;
}
export default function Link({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const target = developerPath(href);
  return <a {...props} href={target} onClick={event => {
    onClick?.(event);
    const editor = requiresDeveloperDocumentNavigation(window.location.pathname, target);
    if (!editor && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !props.target && target.startsWith("/developers")) {
      event.preventDefault(); expoRouter.push(target as Href);
    }
  }} />;
}
export const usePathname = expoPathname;
export function useRouter() {
  const { refresh } = useDeveloperSession();
  const replace = useCallback((path: string) => { void refresh(); expoRouter.replace(developerPath(path) as Href); }, [refresh]);
  return useMemo(() => ({ replace, refresh }), [replace, refresh]);
}
