import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { accountRequest, AccountApiError, DEVELOPER_SESSION_EVENT } from "./lib/account-client";
import { isDeveloperAccount, type DeveloperAccount } from "./lib/developer-types";

type Session = { account: DeveloperAccount | null; loading: boolean; unavailable: boolean; refresh: () => Promise<void> };
const Context = createContext<Session | null>(null);
export function DeveloperSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ account: null as DeveloperAccount | null, loading: true, unavailable: false });
  const generation = useRef(0);
  const mounted = useRef(true);
  const refresh = useCallback(() => {
    const request = ++generation.current;
    setState(previous => ({ ...previous, loading: true }));
    return accountRequest<DeveloperAccount>("auth/me").then(account => {
      if (!isDeveloperAccount(account)) throw new Error("Invalid account response");
      if (mounted.current && request === generation.current) setState({ account, loading: false, unavailable: false });
    }).catch(error => {
      if (mounted.current && request === generation.current) setState({ account: null, loading: false, unavailable: !(error instanceof AccountApiError && error.status === 401) });
    });
  }, []);
  useEffect(() => {
    mounted.current = true;
    const changed = (event: Event) => {
      const account = (event as CustomEvent<{ account: unknown }>).detail?.account;
      if (account === null || isDeveloperAccount(account)) {
        ++generation.current;
        setState({ account, loading: false, unavailable: false });
      }
    };
    window.addEventListener(DEVELOPER_SESSION_EVENT, changed);
    void refresh();
    return () => { mounted.current = false; window.removeEventListener(DEVELOPER_SESSION_EVENT, changed); };
  }, [refresh]);
  return <Context.Provider value={{ ...state, refresh }}>{children}</Context.Provider>;
}
export function useDeveloperSession() {
  const context = useContext(Context);
  if (!context) throw new Error("Developer session provider required");
  return context;
}
