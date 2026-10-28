import {useEffect, useState} from 'react';
import {reviewClient, reviewError, type VersionDetail} from '../lib/mini-app-review';
export function MiniAppProductionDraft({appId, version, resetSignal, disabled, onDirty, onBusy, onChanged}: {
  appId: string; version: VersionDetail; resetSignal: number; disabled: boolean;
  onDirty(value: boolean): void; onBusy(value: boolean): void; onChanged(): void;
}) {
  const [name, setName] = useState(version.version.versionName), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {setName(version.version.versionName);}, [version, resetSignal]);
  useEffect(() => {onDirty(name !== version.version.versionName); return () => onDirty(false);}, [name, version.version.versionName, onDirty]);
  useEffect(() => {onBusy(busy); return () => onBusy(false);}, [busy, onBusy]);
  return <section><h3>Phiên bản Production</h3><p>Phiên bản dùng Auth Bridge với quyền profile và domain đã xác minh của ứng dụng.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <form onSubmit={event => {event.preventDefault(); if (busy || disabled) return; setBusy(true); setError('');
      void reviewClient.updateVersion(appId, version.version.id, {requestId: crypto.randomUUID(), concurrencyToken: version.version.concurrencyToken, versionName: name.trim()})
        .then(onChanged).catch(reason => setError(reviewError(reason))).finally(() => setBusy(false));
    }}><fieldset disabled={disabled || busy}><label htmlFor="production-version-name">Tên phiên bản</label>
      <input id="production-version-name" required maxLength={80} value={name} onChange={event => setName(event.target.value)} />
      <button className="button" disabled={!name.trim() || name === version.version.versionName}>Lưu bản nháp</button>
    </fieldset></form></section>;
}
