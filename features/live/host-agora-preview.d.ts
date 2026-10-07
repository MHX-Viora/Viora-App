import type { Ref } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { AgoraAccess } from "@/services/live.service";

export type HostAgoraPreviewHandle = {
  join(access: AgoraAccess): Promise<void>;
  renew(token: string): Promise<void>;
  leave(): Promise<void>;
};

export type HostAgoraPreviewProps = {
  ref?: Ref<HostAgoraPreviewHandle>;
  appId: string;
  cameraOn: boolean;
  microphoneOn: boolean;
  facing: "front" | "back";
  onReady(): void;
  onError(): void;
  onTokenWillExpire(): void;
  style?: StyleProp<ViewStyle>;
};

export declare function HostAgoraPreview(props: HostAgoraPreviewProps): React.JSX.Element;
