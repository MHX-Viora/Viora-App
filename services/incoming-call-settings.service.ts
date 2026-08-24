import { Alert, NativeModules, Platform } from "react-native";

type IncomingCallSettingsNativeModule = {
  canUseFullScreenIntent(): Promise<boolean>;
  openFullScreenIntentSettings(): Promise<boolean>;
  setCallScreenActive(active: boolean): void;
};

const nativeSettings = NativeModules.IncomingCallSettings as
  | IncomingCallSettingsNativeModule
  | undefined;
let checkedThisLaunch = false;

export const setCallScreenActive = (active: boolean) => {
  if (Platform.OS === "android") nativeSettings?.setCallScreenActive(active);
};

export const guideFullScreenCallPermission = async () => {
  if (Platform.OS !== "android" || !nativeSettings || checkedThisLaunch) return;
  checkedThisLaunch = true;

  const allowed = await nativeSettings.canUseFullScreenIntent();
  if (allowed) return;

  Alert.alert(
    "Cho phép cuộc gọi toàn màn hình",
    "Bật quyền này để ANKT có thể hiện cuộc gọi đến trên màn hình khóa. Nếu chưa bật, bạn vẫn nhận được thông báo nổi có nút Trả lời và Từ chối.",
    [
      { text: "Để sau", style: "cancel" },
      {
        text: "Mở cài đặt",
        onPress: () => {
          void nativeSettings.openFullScreenIntentSettings();
        },
      },
    ],
  );
};
