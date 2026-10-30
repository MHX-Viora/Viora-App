import type { Ref } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { AgoraAccess } from "@/services/live.service";
import type { LivePresentation } from './live-presentation';

export type HostAgoraPreviewHandle = {
  join(access: AgoraAccess): Promise<void>;
  renew(token: string): Promise<void>;
  leave(): Promise<void>;
  shareScreen?(): Promise<void>;
  stopScreenShare?(): Promise<void>;
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
  onScreenShareChanged?(sharing: boolean): void;
  onScreenShareError?(): void;
  onPresentationChanged?(presentation: LivePresentation | null): void;
  style?: StyleProp<ViewStyle>;
};

export declare function HostAgoraPreview(props: HostAgoraPreviewProps): React.JSX.Element;
