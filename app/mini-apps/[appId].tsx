import { useLocalSearchParams } from 'expo-router';
import { MiniAppHostScreen } from '@/features/mini-apps/mini-app-host-screen';

export default function MiniAppRoute() {
  const params = useLocalSearchParams<{ appId?: string | string[] }>();
  // Route input selects only an app ID; URLs, grants and identity never come from params.
  const appId = typeof params.appId === 'string' ? params.appId : '';
  return <MiniAppHostScreen key={appId} appId={appId} />;
}
