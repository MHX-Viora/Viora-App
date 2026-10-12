import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useTheme } from '@/theme';
import { subscribeSessionInvalidation } from '@/stores/session-store';
import { platformRequest } from './api';
import { BridgeGuard } from './bridge.mjs';
import type { AppDetail, Launch, Permission } from './types';

type Message = { id: string; method: string; params: Record<string, unknown> };
export function useRuntime(app: AppDetail, launch: Launch, onClose: () => void) {
  const { theme } = useTheme();
  const [binding] = useState(() => ({ type: 'ANKT_MINI_APP_READY', appId: app.id, sessionId: launch.sessionId, nonce: Crypto.randomUUID().replaceAll('-', ''), autoLogin: app.autoLogin }));
  const guard = useRef<BridgeGuard | null>(null); const active = useRef(true);
  const [consent, setConsent] = useState<Permission[] | null>(null); const consentResolve = useRef<((accepted: boolean) => void) | null>(null);
  const [externalUrl, setExternalUrl] = useState(''); const externalResolve = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; guard.current?.close(); consentResolve.current?.(false); externalResolve.current?.(false); }; }, []);
  useEffect(() => subscribeSessionInvalidation(() => {
    active.current = false; guard.current?.close(); consentResolve.current?.(false); externalResolve.current?.(false); onClose();
  }), [onClose]);
  const confirm = useCallback((permissions: Permission[]) => new Promise<boolean>(resolve => {
    if (consentResolve.current || !active.current) { resolve(false); return; }
    consentResolve.current = resolve; setConsent(permissions);
  }), []);
  const chooseConsent = (accepted: boolean) => { consentResolve.current?.(accepted); consentResolve.current = null; setConsent(null); };
  const chooseExternal = (accepted: boolean) => {
    if (accepted && active.current && guard.current?.active && externalUrl && Platform.OS === 'web') window.open(externalUrl, '_blank', 'noopener,noreferrer');
    externalResolve.current?.(accepted); externalResolve.current = null; setExternalUrl('');
  };
  const validate = async () => {
    const session = await platformRequest<{ active: boolean; permissions: string[] }>(`/api/mini-apps/${app.id}/sessions/validate`, 'POST', { sessionId: launch.sessionId, sessionToken: launch.sessionToken });
    if (!session.active) throw new Error('Phiên ứng dụng đã hết hạn hoặc quyền đã thay đổi.'); return session;
  };
  const handle = async (message: unknown, origin: string, source: unknown, reply: (value: unknown) => void) => {
    if (!guard.current) guard.current = new BridgeGuard({ appId: app.id, sessionId: launch.sessionId, nonce: binding.nonce, origins: app.allowedOrigins ?? [], source });
    if (!guard.current.accept(message, origin, source)) return;
    const acceptedGuard = guard.current;
    const requestBinding = { ...binding };
    const live = () => active.current && acceptedGuard.active && guard.current === acceptedGuard;
    const request = message as Message; let result: unknown;
    try {
      const session = await validate(); if (!live()) return;
      switch (request.method) {
        case 'openExternalUrl': {
          const url = new URL(String(request.params.url));
          if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048 || !session.permissions.includes('app.open_url') || externalResolve.current)
            throw new Error('Đường dẫn hoặc quyền mở website không hợp lệ.');
          const accepted = await new Promise<boolean>(resolve => { externalResolve.current = resolve; setExternalUrl(url.href); });
          if (!accepted || !acceptedGuard.active || !active.current) throw new Error('Bạn đã hủy mở website.');
          if (Platform.OS !== 'web') { await validate(); await Linking.openURL(url.href); } result = { opened: true }; break;
        }
        case 'getPlatformInfo': result = { platform: Platform.OS, version: '2.2', theme: theme.mode }; break;
        case 'getAppInfo': result = { id: app.id, name: app.name, version: app.publishedVersion, developer: app.developer }; break;
        case 'getGrantedPermissions': result = { permissions: session.permissions }; break;
        case 'reportSsoStatus': result = { accepted: ['authenticated', 'failed'].includes(String(request.params.status)) }; break;
        case 'closeMiniApp': result = {}; onClose(); break;
        case 'requestPermission': {
          const permission = app.permissions.find(p => p.code === request.params.permission);
          if (!permission) throw new Error('Ứng dụng chưa được duyệt quyền này.');
          if (!await confirm([permission]) || !live()) throw new Error('Bạn đã từ chối cấp quyền.');
          await platformRequest(`/api/mini-apps/${app.id}/consent`, 'POST', { permissions: [permission.code], granted: true });
          result = { permissions: (await validate()).permissions }; break;
        }
        case 'requestOAuthLogin': {
          if (typeof request.params.redirectUri !== 'string' || !app.callbackUrls?.includes(request.params.redirectUri) || request.params.clientId && request.params.clientId !== app.clientId)
            throw new Error('Callback chưa được đăng ký.');
          const input = { ...request.params, clientId: app.clientId, sessionId: launch.sessionId, sessionToken: launch.sessionToken };
          let decision = await platformRequest<{ requiresConsent: boolean; permissions: Permission[]; authorizeUrl?: string }>('/api/open-api/authorize', 'POST', input);
          if (decision.requiresConsent) {
            if (!await confirm(decision.permissions) || !live()) throw new Error('Bạn đã từ chối đăng nhập.');
            await platformRequest(`/api/mini-apps/${app.id}/consent`, 'POST', { permissions: decision.permissions.map(p => p.code), granted: true });
            decision = await platformRequest('/api/open-api/authorize', 'POST', input);
          }
          if (!decision.authorizeUrl) throw new Error('Không thể bắt đầu đăng nhập.');
          result = { authorizeUrl: decision.authorizeUrl }; break;
        }
      }
      if (live()) reply({ ...requestBinding, type: 'ANKT_MINI_APP_RESPONSE', id: request.id, result });
    } catch (e) {
      if (live()) reply({ ...requestBinding, type: 'ANKT_MINI_APP_RESPONSE', id: request.id, error: { code: 'BRIDGE_ERROR', message: e instanceof Error ? e.message : 'Không thể thực hiện yêu cầu.' } });
    }
  };
  return { binding, handle, consent, chooseConsent, externalUrl, chooseExternal, invalidate: () => { guard.current?.close(); guard.current = null; consentResolve.current?.(false); consentResolve.current = null; externalResolve.current?.(false); externalResolve.current = null; setExternalUrl(''); setConsent(null); binding.nonce = Crypto.randomUUID().replaceAll('-', ''); } };
}
