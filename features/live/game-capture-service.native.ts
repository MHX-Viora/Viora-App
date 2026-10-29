import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const service = requireOptionalNativeModule<{ start(): void; stop(): void }>('LiveGameCapture');

export function startGameCaptureService() {
  if (Platform.OS !== 'android') throw new Error('Bản iPhone hiện chưa hỗ trợ live màn hình/game. Bạn có thể dùng web máy tính hoặc Android.');
  if (!service) throw new Error('Hãy cập nhật bản cài ứng dụng để dùng live màn hình/game.');
  service.start();
}

export function stopGameCaptureService() {
  if (Platform.OS === 'android') service?.stop();
}
