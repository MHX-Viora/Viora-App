import { Text } from 'react-native';
export type HostProps = { appId: string; attempt: number; onStatus: (status: string) => void };
export default function MiniAppHost(_props: HostProps) {
  return <Text accessibilityRole="alert">Mini App chưa hỗ trợ trên thiết bị này.</Text>;
}
