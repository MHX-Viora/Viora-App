import React, { useEffect, useState } from 'react';
import { isDeveloperAccount, type DeveloperAccount } from '../../lib/developer-types';
export function AccountControls() {
  const [account, setAccount] = useState<DeveloperAccount | null>(null);
  useEffect(() => {
    const cancellation = new AbortController();
    void fetch('/developers/api/account/auth/me', { credentials: 'same-origin', cache: 'no-store', signal: cancellation.signal,
      headers: { 'X-ANKT-Developer': '1', Accept: 'application/json' } }).then(async response => {
      if (response.ok) { const value: unknown = await response.json(); if (!cancellation.signal.aborted && isDeveloperAccount(value)) setAccount(value); }
    }).catch(() => {});
    return () => cancellation.abort();
  }, []);
  return <div className="docs-account">{account ? <a className="docs-console-link button button-small" href="/developers/console"><span className="docs-avatar" aria-hidden="true">{account.fullName.slice(0, 1)}</span>Điều khiển</a> : <><a href="/developers/login">Đăng nhập</a><a className="button button-small" href="/developers/register">Đăng ký</a></>}</div>;
}
