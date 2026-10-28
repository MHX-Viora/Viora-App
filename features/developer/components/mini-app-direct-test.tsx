import type { MiniApp } from '../lib/mini-app-client';
import { MiniAppAuthBridgePreview } from './mini-app-auth-bridge-preview';
export function MiniAppDirectTest({app}: {app: MiniApp}) {
  return <MiniAppAuthBridgePreview appId={app.appId} />;
}
