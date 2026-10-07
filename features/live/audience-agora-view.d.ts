import type { StyleProp, ViewStyle } from "react-native";
import type { AgoraAccess } from "@/services/live.service";

export type LivePlaybackState = "connecting" | "waitingForHost" | "playing" | "reconnecting" | "ended" | "error";

export type AudienceAgoraViewProps = {
  access: AgoraAccess;
  style?: StyleProp<ViewStyle>;
  onTokenWillExpire: () => void;
  onError: () => void;
  onPlaybackStateChange?: (state: LivePlaybackState) => void;
};

export declare function AudienceAgoraView(props: AudienceAgoraViewProps): React.JSX.Element;
