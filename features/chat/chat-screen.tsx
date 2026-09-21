import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEvent } from "expo";
import { Image as ExpoImage } from "expo-image";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "zustand";

import { AddMembersModal } from "@/components/chat/add-members-modal";
import { ChatComposerNotice } from "@/components/chat/chat-composer-notice";
import { ChatMediaViewer } from "@/components/chat/chat-media-viewer";
import { PendingAttachmentPreview } from "@/components/chat/pending-attachment-preview";
import { showAppToast } from "@/components/common/app-toast";
import { UserAvatar } from "@/components/common/user-avatar";
import { MentionSuggestions } from "@/components/mentions/mention-suggestions";
import { MentionText } from "@/components/mentions/mention-text";
import { StickerPanel } from "@/features/stickers/sticker-panel";
import { rememberSticker } from "@/features/stickers/recent-sticker-storage";
import {
  CHAT_PAGE_SIZE,
  GOOGLE_MAPS_URL_PATTERN,
} from "@/constants/chat";
import {
  getActiveVoiceCall,
  subscribeCallLifecycle,
  subscribeIncomingCalls,
  subscribeActiveVoiceCall,
  type ActiveVoiceCall,
} from "@/features/calls/call-events";
import {
  getActiveChatConversation,
  setActiveChatConversation,
  subscribeRealtimeConversationBlockedChanges,
  subscribeRealtimeConversationDissolved,
  subscribeRealtimeMessageDeleted,
  subscribeRealtimeMessageDelivered,
  subscribeRealtimeMessages,
} from "@/features/chat/chat-events";
import { canMarkConversationRead } from "@/features/chat/chat-read-visibility";
import { isMessageFromCurrentUser } from "@/features/chat/chat-realtime-policy";
import {
  ChatAttachmentUploadError,
  getConversation,
  getConversationMessages,
  getGroupMembers,
  markConversationRead,
  recallChatMessage,
  sendChatMessage,
} from "@/services/chat.service";
import { createVoiceCall } from "@/services/call.service";
import {
  getActiveGroupCall,
  startGroupCall,
} from "@/services/group-call.service";
import { startCallRealtime } from "@/services/call-realtime.service";
import { downloadChatAttachment } from "@/services/chat-attachment-download.service";
import {
  persistLocalMessageChanges,
  persistLocalMessages,
  readOlderLocalMessages,
  readRecentLocalMessages,
} from "@/services/chat-local-cache.service";
import { syncChatUnreadCount } from "@/services/chat-sync.service";
import { searchMentionUsers } from "@/services/mention.service";
import { joinRealtimeGroup, leaveRealtimeGroup } from "@/services/realtime.service";
import { getUser } from "@/stores/session-store";
import {
  clearMessageCache,
  deleteMessageRetry,
  getCachedMessages,
  getMessageCache,
  getMessageRetry,
  isMessageCacheStale,
  MAX_MESSAGES_PER_CONVERSATION,
  messageCacheStore,
  setCachedMessagePage,
  setCachedMessageHasNoMore,
  setCachedMessages,
  setMessageLoadingState,
  setMessageRetry,
} from "@/stores/message-cache";
import { spacing } from "@/theme";
import { CallType } from "@/types/call";
import { MessageType } from "@/types/chat";
import type {
  ChatAttachment,
  ChatMessage,
  ChatParticipant,
  Conversation,
  SendMessageAttachment,
} from "@/types/chat";
import type { MentionReference, MentionUser } from "@/types/mention";
import type { Sticker } from "@/types/sticker";
import { activeMentionIds, insertMention } from "@/utils/mention-composer";
import { toggleChatAudioPlayback } from "@/utils/chat-audio-playback";
import { createRecordedChatAttachment } from "@/utils/chat-recording";
import { formatChatTime } from "@/utils/chat-time";
import { buildChatSendUnits } from "./chat-send-units";
import {
  DEFAULT_CHAT_VIDEO_SIZE,
  getChatVideoSize,
} from "./chat-media-layout";
import {
  getRealtimeConversationGroupName,
  isConversationGoneError,
  markMessageRecalled,
  pendingAttachmentToViewerAttachment,
  toNewestFirstMessages,
} from "@/utils/chat-message";
import { useKeyboardVisible } from "@/hooks/chat/use-keyboard-visible";
import { useChatPermissions } from "@/hooks/chat/use-chat-permissions";
import { type ThemeColors, useTheme } from "@/theme";
import {
  getMessageInputHeight,
  isMessageInputScrollable,
  MAX_MESSAGE_INPUT_HEIGHT,
  MIN_MESSAGE_INPUT_HEIGHT,
} from "./message-composer-layout";

function AttachmentDownloadOverlay() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View pointerEvents="none" style={styles.attachmentDownloadOverlay}>
      <ActivityIndicator color={colors.white} size="small" />
      <Text style={styles.attachmentDownloadText}>Đang tải xuống...</Text>
    </View>
  );
}

function AudioAttachment({
  attachment,
  isDownloading,
  isMine,
  onLongPress,
}: {
  attachment: ChatAttachment;
  isDownloading: boolean;
  isMine: boolean;
  onLongPress: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const player = useAudioPlayer(attachment.url);
  const status = useAudioPlayerStatus(player);
  const durationLabel = status.duration
    ? `${Math.max(1, Math.round(status.duration))}s`
    : "Âm thanh";
  const activeWaveBars =
    status.playing && status.duration
      ? Math.max(1, Math.ceil((status.currentTime / status.duration) * 18))
      : 0;

  return (
    <Pressable
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={() =>
        void toggleChatAudioPlayback({
          player,
          preparePlayback: () =>
            setAudioModeAsync({
              allowsRecording: false,
              playsInSilentMode: true,
            }),
          status,
        }).catch(() =>
          Alert.alert("Không thể phát âm thanh", "Vui lòng thử lại."),
        )
      }
      style={[styles.audioPill, isMine && styles.mineAudioPill]}
    >
      <Ionicons
        color={colors.primary}
        name={status.playing ? "pause-circle" : "play-circle"}
        size={26}
      />
      <View style={styles.audioBody}>
        <View style={styles.waveform}>
          {Array.from({ length: 18 }).map((_, index) => (
            <View
              key={`${attachment.id}-${index}`}
              style={[
                styles.waveBar,
                isMine && styles.mineWaveBar,
                status.playing &&
                  index < activeWaveBars &&
                  styles.activeWaveBar,
                status.playing &&
                  index < activeWaveBars &&
                  isMine &&
                  styles.mineActiveWaveBar,
                { height: 5 + ((index * 5) % 14) },
              ]}
            />
          ))}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.audioLabel, isMine && styles.mineAudioLabel]}
        >
          {durationLabel}
        </Text>
      </View>
      {isDownloading ? <AttachmentDownloadOverlay /> : null}
    </Pressable>
  );
}

function ImageAttachment({
  attachment,
  isDownloading,
  onLayoutReady,
  onLongPress,
  onOpen,
}: {
  attachment: ChatAttachment;
  isDownloading: boolean;
  onLayoutReady: () => void;
  onLongPress: () => void;
  onOpen: (attachment: ChatAttachment) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [hasError, setHasError] = useState(false);
  const [size, setSize] = useState({ height: 180, width: 220 });

  useEffect(() => {
    setHasError(false);
    Image.getSize(
      attachment.url,
      (width, height) => {
        const maxWidth = 240;
        const maxHeight = 320;
        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        setSize({
          height: Math.max(80, Math.round(height * scale)),
          width: Math.max(80, Math.round(width * scale)),
        });
        onLayoutReady();
      },
      () => {
        setHasError(true);
        onLayoutReady();
      },
    );
  }, [attachment.url]);

  if (hasError) {
    return (
      <View style={[styles.mediaLoadError, size]}>
        <Ionicons color={colors.textMuted} name="image-outline" size={28} />
        <Text style={styles.mediaLoadErrorText}>Ảnh không tải được</Text>
      </View>
    );
  }

  return (
    <Pressable
      onLongPress={onLongPress}
      onPress={() => onOpen(attachment)}
      style={styles.downloadableAttachment}
    >
      <Image
        onError={() => {
          setHasError(true);
          onLayoutReady();
        }}
        resizeMode="contain"
        source={{ uri: attachment.url }}
        style={[styles.messageImage, size]}
      />
      {isDownloading ? <AttachmentDownloadOverlay /> : null}
    </Pressable>
  );
}

function AttachmentView({
  allowLocalPreview,
  attachment,
  isDownloading,
  isMine,
  onLayoutReady,
  onLongPress,
  onOpen,
}: {
  allowLocalPreview: boolean;
  attachment: ChatAttachment;
  isDownloading: boolean;
  isMine: boolean;
  onLayoutReady: () => void;
  onLongPress: () => void;
  onOpen: (attachment: ChatAttachment) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (attachment.type === "image") {
    return (
      <ImageAttachment
        attachment={attachment}
        isDownloading={isDownloading}
        onLayoutReady={onLayoutReady}
        onLongPress={onLongPress}
        onOpen={onOpen}
      />
    );
  }

  if (attachment.type === "video") {
    return (
      <VideoAttachment
        allowLocalPreview={allowLocalPreview}
        attachment={attachment}
        isDownloading={isDownloading}
        onLayoutReady={onLayoutReady}
        onLongPress={onLongPress}
        onOpen={onOpen}
      />
    );
  }

  if (attachment.type === "audio") {
    return (
      <AudioAttachment
        attachment={attachment}
        isDownloading={isDownloading}
        isMine={isMine}
        onLongPress={onLongPress}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      onLongPress={onLongPress}
      onPress={async () => {
        try {
          const canOpen = await Linking.canOpenURL(attachment.url);
          if (!canOpen) {
            Alert.alert("Không thể mở tài liệu", "Thiết bị không hỗ trợ mở tệp này.");
            return;
          }
          await Linking.openURL(attachment.url);
        } catch (error) {
          Alert.alert(
            "Không thể mở tài liệu",
            error instanceof Error ? error.message : "Vui lòng thử lại.",
          );
        }
      }}
      style={[styles.filePill, isMine && styles.mineFilePill]}
    >
      <View style={[styles.fileIcon, isMine && styles.mineFileIcon]}>
        <Ionicons color={colors.primary} name="document-text-outline" size={22} />
      </View>
      <View style={styles.fileText}>
        <Text
          numberOfLines={1}
          style={[styles.fileName, isMine && styles.mineFileName]}
        >
          {attachment.name}
        </Text>
        <Text style={[styles.fileMeta, isMine && styles.mineFileMeta]}>Tệp</Text>
      </View>
      <Ionicons
        color={colors.primary}
        name="open-outline"
        size={18}
      />
      {isDownloading ? <AttachmentDownloadOverlay /> : null}
    </Pressable>
  );
}

function VideoAttachment({
  allowLocalPreview,
  attachment,
  isDownloading,
  onLayoutReady,
  onLongPress,
  onOpen,
}: {
  allowLocalPreview: boolean;
  attachment: ChatAttachment;
  isDownloading: boolean;
  onLayoutReady: () => void;
  onLongPress: () => void;
  onOpen: (attachment: ChatAttachment) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isLocalCacheUrl = attachment.url.startsWith("file://");
  const videoViewRef = useRef<VideoView>(null);
  const [videoSize, setVideoSize] = useState(DEFAULT_CHAT_VIDEO_SIZE);
  const player = useVideoPlayer(attachment.url, (nextPlayer) => {
    nextPlayer.muted = true;
  });
  const { videoTrack } = useEvent(player, "videoTrackChange", {
    videoTrack: player.videoTrack,
  });

  useEffect(() => {
    const sourceSize = videoTrack?.size;
    if (!sourceSize) return;
    setVideoSize(getChatVideoSize(sourceSize));
  }, [videoTrack?.size.height, videoTrack?.size.width]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const videoElement = videoViewRef.current?.nativeRef.current as
      | {
          addEventListener: (type: string, listener: () => void) => void;
          removeEventListener: (type: string, listener: () => void) => void;
          videoHeight: number;
          videoWidth: number;
        }
      | null;
    if (!videoElement) return;

    const syncVideoSize = () => {
      if (videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) return;
      setVideoSize(
        getChatVideoSize({
          height: videoElement.videoHeight,
          width: videoElement.videoWidth,
        }),
      );
    };

    setVideoSize(DEFAULT_CHAT_VIDEO_SIZE);
    syncVideoSize();
    videoElement.addEventListener("loadedmetadata", syncVideoSize);
    return () =>
      videoElement.removeEventListener("loadedmetadata", syncVideoSize);
  }, [attachment.url]);

  if (isLocalCacheUrl && !allowLocalPreview) {
    return (
      <View style={styles.mediaLoadError}>
        <Ionicons color={colors.textMuted} name="videocam-outline" size={28} />
        <Text style={styles.mediaLoadErrorText}>Video không tải được</Text>
      </View>
    );
  }

  return (
    <Pressable
      onLongPress={onLongPress}
      onPress={() => onOpen(attachment)}
      style={[styles.videoThumb, videoSize]}
    >
      <VideoView
        contentFit="contain"
        nativeControls={false}
        onFirstFrameRender={onLayoutReady}
        player={player}
        ref={videoViewRef}
        style={styles.videoThumbImage}
      />
      <View style={styles.videoPlayOverlay}>
        <Ionicons color={colors.white} name="play" size={28} />
      </View>
      {isDownloading ? <AttachmentDownloadOverlay /> : null}
    </Pressable>
  );
}

function LocationCard({
  isMine,
  onLongPress,
  url,
}: {
  isMine: boolean;
  onLongPress: () => void;
  url: string;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="link"
      onLongPress={onLongPress}
      onPress={() => Linking.openURL(url)}
      style={[styles.locationCard, isMine && styles.mineLocationCard]}
    >
      <Ionicons
        color={colors.primary}
        name="location"
        size={18}
      />
      <View style={styles.locationTextWrap}>
        <Text style={styles.locationTitle}>
          Vị trí hiện tại
        </Text>
        <Text
          numberOfLines={1}
          style={styles.locationSubtitle}
        >
          Mở bằng Google Maps
        </Text>
      </View>
    </Pressable>
  );
}

function SystemMessage({ message }: { message: ChatMessage }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isVideoCall = message.content.startsWith("Cuộc gọi video");
  const isCallHistory =
    isVideoCall || message.content.startsWith("Cuộc gọi thoại");

  if (isCallHistory) {
    return (
      <View
        style={[
          styles.messageRow,
          message.isMine ? styles.mineRow : styles.theirRow,
        ]}
      >
        {!message.isMine ? (
          <UserAvatar displayName={message.sender.displayName} imageUrl={message.sender.avatarUrl} size={32} style={styles.smallAvatar} />
        ) : null}
        <View
          style={[
            styles.callHistoryMessage,
            message.isMine
              ? styles.mineCallHistoryMessage
              : styles.theirCallHistoryMessage,
          ]}
        >
          {!message.isMine ? (
            <Text numberOfLines={1} style={styles.senderName}>
              {message.sender.displayName}
            </Text>
          ) : null}
          <View style={styles.callHistoryContent}>
            <Ionicons
              color={colors.primary}
              name={isVideoCall ? "videocam" : "call"}
              size={18}
            />
            <Text style={styles.callHistoryMessageText}>{message.content}</Text>
          </View>
          <Text style={styles.messageTime}>
            {formatChatTime(message.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.systemMessageRow}>
      <View style={styles.systemMessageBubble}>
        <Text style={styles.systemMessageText}>{message.content}</Text>
      </View>
    </View>
  );
}

function MessageSendStatus({
  isMedia,
  onRetry,
  status,
  styles,
}: {
  isMedia: boolean;
  onRetry: () => void;
  status?: ChatMessage["sendStatus"];
  styles: ReturnType<typeof createStyles>;
}) {
  const initialStatus = status && status !== "sent" ? status : null;
  const [displayedStatus, setDisplayedStatus] = useState(initialStatus);
  const displayedStatusRef = useRef(displayedStatus);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const nextStatus = status && status !== "sent" ? status : null;
    let animation: Animated.CompositeAnimation | undefined;

    if (nextStatus) {
      displayedStatusRef.current = nextStatus;
      setDisplayedStatus(nextStatus);
      opacity.setValue(0);
      translateX.setValue(6);
      animation = Animated.parallel([
        Animated.timing(opacity, {
          duration: 180,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          duration: 180,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]);
      animation.start();
    } else if (displayedStatusRef.current) {
      animation = Animated.parallel([
        Animated.timing(opacity, {
          duration: 180,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          duration: 180,
          toValue: -4,
          useNativeDriver: true,
        }),
      ]);
      animation.start(({ finished }) => {
        if (finished) {
          displayedStatusRef.current = null;
          setDisplayedStatus(null);
        }
      });
    }

    return () => animation?.stop();
  }, [opacity, status, translateX]);

  if (!displayedStatus) return null;

  const label = (
    <Animated.Text
      accessibilityLiveRegion="polite"
      style={[
        styles.sendStatus,
        isMedia && styles.mediaSendStatus,
        displayedStatus === "failed" && styles.failedSendStatus,
        { opacity, transform: [{ translateX }] },
      ]}
    >
      {displayedStatus === "sending" ? "· Đang gửi" : "· Gửi lỗi · Thử lại"}
    </Animated.Text>
  );

  return displayedStatus === "failed" ? (
    <Pressable
      accessibilityLabel="Gửi lại tin nhắn"
      accessibilityRole="button"
      onPress={onRetry}
    >
      {label}
    </Pressable>
  ) : label;
}

function StickerMessage({ message, onLongPress }: { message: ChatMessage; onLongPress: () => void }) {
  if (!message.sticker?.imageUrl) return null;
  return (
    <Pressable accessibilityLabel={`Nhãn dán ${message.sticker.name}`} onLongPress={onLongPress}>
      <ExpoImage cachePolicy="memory-disk" contentFit="contain" source={{ uri: message.sticker.imageUrl }} style={stickerMessageStyles.image} />
    </Pressable>
  );
}

const stickerMessageStyles = StyleSheet.create({ image: { aspectRatio: 1, height: 180, maxWidth: 220, width: 180 } });

function MessageRow({
  actionAttachment,
  downloadingAttachmentId,
  isActionsOpen,
  isHighlighted,
  message,
  showAvatar,
  canReply,
  onMediaLayout,
  onCloseActions,
  onDownloadAttachment,
  onOpenActions,
  onRecall,
  onForward,
  onReply,
  onReplyPress,
  onOpenAttachment,
  onRetry,
}: {
  actionAttachment: ChatAttachment | null;
  downloadingAttachmentId: string | null;
  isActionsOpen: boolean;
  isHighlighted: boolean;
  message: ChatMessage;
  showAvatar: boolean;
  canReply: boolean;
  onMediaLayout: () => void;
  onCloseActions: () => void;
  onDownloadAttachment: (attachment: ChatAttachment) => void;
  onOpenActions: (message: ChatMessage, attachment?: ChatAttachment) => void;
  onRecall: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onReply: (message: ChatMessage) => void;
  onReplyPress: (messageId: string) => void;
  onOpenAttachment: (attachment: ChatAttachment) => void;
  onRetry: (message: ChatMessage) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (message.messageType === MessageType.System) {
    return <SystemMessage message={message} />;
  }

  const locationUrl = message.content.match(GOOGLE_MAPS_URL_PATTERN)?.[0] ?? "";
  const textContent = locationUrl
    ? message.content.replace(locationUrl, "").trim()
    : message.content;
  const recallText = message.isMine
    ? "Bạn đã thu hồi một tin nhắn."
    : `${message.sender.displayName} đã thu hồi một tin nhắn.`;
  const hasBubbleBackground =
    message.isDeleted ||
    Boolean(textContent);
  const canRecall =
    message.isMine && !message.isDeleted && !message.id.startsWith("pending-");
  const actions = (
    <View
      style={[
        styles.messageActionMenu,
        message.isMine
          ? styles.mineMessageActionMenu
          : styles.theirMessageActionMenu,
      ]}
    >
      {canReply ? (
        <Pressable
          accessibilityLabel="Trả lời tin nhắn"
          onPress={() => {
            onReply(message);
            onCloseActions();
          }}
          style={styles.messageActionButton}
        >
          <Ionicons color={colors.primary} name="return-up-back" size={18} />
        </Pressable>
      ) : null}
      {canRecall ? (
        <Pressable
          accessibilityLabel="Thu hồi tin nhắn"
          onPress={() => {
            onRecall(message);
            onCloseActions();
          }}
          style={[styles.messageActionButton, styles.recallActionButton]}
        >
          <Ionicons color={colors.danger} name="trash-outline" size={18} />
        </Pressable>
      ) : null}
      {!message.id.startsWith("pending-") ? (
        <Pressable
          accessibilityLabel="Chuyển tiếp tin nhắn"
          onPress={() => {
            onForward(message);
            onCloseActions();
          }}
          style={styles.messageActionButton}
        >
          <Ionicons color={colors.primary} name="arrow-redo-outline" size={18} />
        </Pressable>
      ) : null}
      {actionAttachment && !actionAttachment.url.startsWith("file://") ? (
        <Pressable
          accessibilityLabel="Tải tệp đính kèm"
          disabled={downloadingAttachmentId === actionAttachment.id}
          onPress={() => {
            onDownloadAttachment(actionAttachment);
            onCloseActions();
          }}
          style={styles.messageActionButton}
        >
          {downloadingAttachmentId === actionAttachment.id ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons color={colors.primary} name="download-outline" size={18} />
          )}
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Pressable
      onPress={onCloseActions}
      onLongPress={() => {
        onOpenActions(message);
      }}
      style={[
        styles.messageRow,
        message.isMine ? styles.mineRow : styles.theirRow,
        isHighlighted && styles.highlightedRow,
      ]}
    >
      {!message.isMine && showAvatar ? (
        <UserAvatar displayName={message.sender.displayName} imageUrl={message.sender.avatarUrl} size={32} style={styles.smallAvatar} />
      ) : !message.isMine ? (
        <View style={styles.avatarSpace} />
      ) : null}
      {message.isMine && isActionsOpen ? actions : null}
      <View
        style={[
          styles.bubble,
          !hasBubbleBackground
            ? styles.mediaBubble
            : message.isMine
              ? styles.mineBubble
              : styles.theirBubble,
        ]}
      >
        {!message.isMine && showAvatar && (
          <Text numberOfLines={1} style={styles.senderName}>
            {message.sender.displayName}
          </Text>
        )}
        {message.isDeleted ? (
          <Text
            style={[
              styles.recalledMessageText,
              message.isMine && styles.mineRecalledMessageText,
            ]}
          >
            {recallText}
          </Text>
        ) : null}
        {!message.isDeleted && message.reply && (
          <Pressable
            accessibilityRole="button"
            onPress={() => onReplyPress(message.reply?.id ?? "")}
            style={[
              styles.replyBox,
              message.isMine && styles.mineReplyBox,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.replyName, message.isMine && styles.mineReplyName]}
            >
              {message.reply.senderName}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.replyText, message.isMine && styles.mineReplyText]}
            >
              {message.reply.content}
            </Text>
          </Pressable>
        )}
        {!message.isDeleted && locationUrl ? (
          <LocationCard
            isMine={message.isMine}
            onLongPress={() => onOpenActions(message)}
            url={locationUrl}
          />
        ) : null}
        {!message.isDeleted && textContent ? (
          <MentionText
            mentions={message.mentions}
            style={[styles.messageText, message.isMine && styles.mineText]}
          >
            {textContent}
          </MentionText>
        ) : null}
        {!message.isDeleted && message.messageType === MessageType.Sticker ? (
          <StickerMessage message={message} onLongPress={() => onOpenActions(message)} />
        ) : null}
        {!message.isDeleted && message.attachments.map((attachment) => (
          <AttachmentView
            allowLocalPreview={
              message.sendStatus === "sending" || message.sendStatus === "failed"
            }
            attachment={attachment}
            isDownloading={downloadingAttachmentId === attachment.id}
            isMine={message.isMine}
            key={attachment.id}
            onLayoutReady={onMediaLayout}
            onLongPress={() => onOpenActions(message, attachment)}
            onOpen={onOpenAttachment}
          />
        ))}
        {!message.isDeleted && message.reactions.length > 0 && (
          <View style={styles.reactions}>
            {message.reactions.map((reaction) => (
              <Text key={reaction.id} style={styles.reaction}>
                {reaction.emoji} {reaction.count}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.messageMeta}>
          <Text
            style={[
              styles.messageTime,
              message.isMine && hasBubbleBackground && styles.mineTime,
              !hasBubbleBackground && styles.mediaTime,
            ]}
          >
            {formatChatTime(message.createdAt)}
          </Text>
          {message.isMine ? (
            <MessageSendStatus
              isMedia={!hasBubbleBackground}
              onRetry={() => onRetry(message)}
              status={message.sendStatus}
              styles={styles}
            />
          ) : null}
        </View>
      </View>
      {!message.isMine && isActionsOpen ? actions : null}
    </Pressable>
  );
}

export function ChatScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const params = useLocalSearchParams<{
    conversationAvatarUrl?: string;
    conversationId?: string;
    conversationName?: string;
    conversationType?: "Private" | "Group";
    isMuted?: string;
    isPinned?: string;
    isBlocked?: string;
    isVerified?: string;
    memberCount?: string;
    otherAvatarUrl?: string;
    otherUserId?: string;
    otherUserName?: string;
    role?: string;
    scrollToMessageId?: string;
  }>();
  const conversationId = params.conversationId ?? "";
  const initialConversationDetails = useMemo<Conversation | null>(() => {
    if (!conversationId && !params.conversationName) return null;

    const conversationType = params.conversationType ?? "Private";
    const memberCount = Number.parseInt(params.memberCount ?? "", 10);
    const role = Number.parseInt(params.role ?? "0", 10);
    const otherParticipant =
      conversationType === "Private"
        ? {
            avatarUrl:
              params.otherAvatarUrl || params.conversationAvatarUrl || null,
            displayName:
              params.otherUserName || params.conversationName || "Chat",
            id: params.otherUserId || "",
            isVerified: params.isVerified === "true",
          }
        : null;

    return {
      avatarUrl: params.conversationAvatarUrl || null,
      conversationType,
      id: conversationId,
      isMuted: params.isMuted === "true",
      isPinned: params.isPinned === "true",
      lastMessage: null,
      memberCount: Number.isNaN(memberCount) ? undefined : memberCount,
      name: params.conversationName || "Chat",
      otherParticipant,
      role: Number.isNaN(role) ? 0 : role,
      unreadCount: 0,
    };
  }, [
    conversationId,
    params.conversationAvatarUrl,
    params.conversationName,
    params.conversationType,
    params.isMuted,
    params.isPinned,
    params.isVerified,
    params.memberCount,
    params.otherAvatarUrl,
    params.otherUserId,
    params.otherUserName,
    params.role,
  ]);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const pendingScrollToEndRef = useRef(false);
  const pendingScrollAnimatedRef = useRef(false);
  const pendingOutgoingIdsRef = useRef(new Set<string>());
  const bufferedMineMessagesRef = useRef(new Map<string, ChatMessage>());
  const isAtBottomRef = useRef(true);
  const dissolvedRef = useRef(false);
  const isConversationFocusedRef = useRef(false);
  const activeConversationIdRef = useRef(conversationId);
  activeConversationIdRef.current = conversationId;
  const [messages, setMessageState] = useState<ChatMessage[]>(() =>
    getCachedMessages(conversationId),
  );
  const zustandRoomEntry = useStore(
    messageCacheStore,
    (state) => state.entries.get(conversationId),
  );
  const [page, setPage] = useState(
    () => getMessageCache(conversationId)?.page ?? 1,
  );
  const [totalPages, setTotalPages] = useState(
    () => getMessageCache(conversationId)?.totalPages ?? 1,
  );
  const [isLoading, setIsLoading] = useState(
    () => !getMessageCache(conversationId)?.initialized,
  );
  const [, setIsBackgroundRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [content, setContent] = useState("");
  const [messageInputHeight, setMessageInputHeight] = useState(
    MIN_MESSAGE_INPUT_HEIGHT,
  );
  const [isMessageInputScrollableState, setIsMessageInputScrollableState] =
    useState(false);
  const [draftMentions, setDraftMentions] = useState<MentionReference[]>([]);
  const [attachments, setAttachments] = useState<SendMessageAttachment[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [actionMessageId, setActionMessageId] = useState<string | null>(null);
  const [actionAttachment, setActionAttachment] = useState<ChatAttachment | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [showChatTools, setShowChatTools] = useState(false);
  const [hoveredComposerAction, setHoveredComposerAction] = useState<
    "attachment" | "sticker" | "send" | null
  >(null);
  const isKeyboardVisible = useKeyboardVisible();
  const [isBlocked, setIsBlocked] = useState(params.isBlocked === "true");
  const [blockedBy, setBlockedBy] = useState<ChatParticipant | null>(null);
  const [conversationDetails, setConversationDetails] =
    useState<Conversation | null>(initialConversationDetails);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [viewingAttachment, setViewingAttachment] =
    useState<ChatAttachment | null>(null);
  const [addMembersVisible, setAddMembersVisible] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [activeGroupCallId, setActiveGroupCallId] = useState("");
  const [activeVoiceCall, setActiveVoiceCallState] = useState<ActiveVoiceCall | null>(
    () => getActiveVoiceCall(),
  );
  const [messagePermissions, setMessagePermissions] = useState<{
    canSendMessage: boolean;
    onlyAdminCanSend: boolean;
  } | null>(null);
  const isGroupConversation =
    (conversationDetails?.conversationType ?? params.conversationType) === "Group";

  useEffect(() => {
    if (!zustandRoomEntry) return;
    setMessageState(zustandRoomEntry.messages);
    setPage(zustandRoomEntry.page);
    setTotalPages(zustandRoomEntry.totalPages);
  }, [zustandRoomEntry]);

  const setMessages = useCallback(
    (update: SetStateAction<ChatMessage[]>) => {
      const apply = (current: ChatMessage[]) =>
        typeof update === "function" ? update(current) : update;

      if (activeConversationIdRef.current !== conversationId) {
        const previous = getCachedMessages(conversationId);
        const next = apply(previous);
        setCachedMessages(conversationId, next);
        void persistLocalMessageChanges(previous, next);
        return;
      }

      const previous = getCachedMessages(conversationId);
      const next = apply(previous);
      const cached = setCachedMessages(conversationId, next);
      void persistLocalMessageChanges(previous, cached.messages);
      setMessageState(cached.messages);
    },
    [conversationId],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isGroupConversation) {
        setActiveGroupCallId("");
        return;
      }
      let active = true;
      void getActiveGroupCall(conversationId)
        .then((call) => {
          if (active) setActiveGroupCallId(call.id);
        })
        .catch(() => {
          if (active) setActiveGroupCallId("");
        });
      return () => {
        active = false;
      };
    }, [conversationId, isGroupConversation]),
  );

  useEffect(() => {
    const unsubscribeIncoming = subscribeIncomingCalls((event) => {
      if (event.isGroupCall && event.conversationId === conversationId) {
        setActiveGroupCallId(event.callId);
      }
    });
    const unsubscribeLifecycle = subscribeCallLifecycle((event) => {
      if (
        event.eventName === "GroupCallEnded" &&
        event.conversationId === conversationId
      ) {
        setActiveGroupCallId("");
      }
    });
    return () => {
      unsubscribeIncoming();
      unsubscribeLifecycle();
    };
  }, [conversationId]);

  const normalizeMessage = useCallback(
    (message: ChatMessage): ChatMessage => message,
    [],
  );

  const flushBufferedMineMessages = useCallback(() => {
    if (
      pendingOutgoingIdsRef.current.size > 0 ||
      bufferedMineMessagesRef.current.size === 0
    ) {
      return;
    }

    const bufferedMessages = [...bufferedMineMessagesRef.current.values()].reverse();
    bufferedMineMessagesRef.current.clear();
    setMessages((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      return [
        ...bufferedMessages.filter((item) => !existingIds.has(item.id)),
        ...current,
      ];
    });
  }, [setMessages]);

  const finishPendingOutgoing = useCallback(
    (optimisticId: string, confirmedId?: string) => {
      pendingOutgoingIdsRef.current.delete(optimisticId);
      if (confirmedId) bufferedMineMessagesRef.current.delete(confirmedId);
      flushBufferedMineMessages();
    },
    [flushBufferedMineMessages],
  );

  const searchChatMentionUsers = useCallback(
    async (keyword: string): Promise<MentionUser[]> => {
      if (!isGroupConversation) {
        return searchMentionUsers(keyword);
      }

      const page = await getGroupMembers(conversationId, {
        keyword,
        page: 1,
        pageSize: 20,
      });

      return page.items
        .filter((member) => member.id !== currentUserId)
        .map((member) => ({
          avatarUrl: member.avatarUrl,
          displayName: member.displayName,
          id: member.id,
          isVerified: member.isVerified,
        }));
    },
    [conversationId, currentUserId, isGroupConversation],
  );

  const scrollToEndAfterLayout = useCallback((animated: boolean) => {
    pendingScrollToEndRef.current = true;
    pendingScrollAnimatedRef.current = animated;
    requestAnimationFrame(() =>
      listRef.current?.scrollToOffset({ animated, offset: 0 }),
    );
  }, []);

  const handleConversationDissolved = useCallback(() => {
    if (dissolvedRef.current) return;
    dissolvedRef.current = true;
    clearMessageCache(conversationId);
    setActiveChatConversation(null);
    void leaveRealtimeGroup(getRealtimeConversationGroupName(conversationId)).catch(() => undefined);
    showAppToast({ message: "Nhóm đã bị giải tán.", type: "success" });
    router.replace("/(tabs)/chat");
  }, [conversationId]);

  const handleRoomApiError = useCallback(
    (error: unknown) => {
      if (isConversationGoneError(error)) {
        handleConversationDissolved();
        return true;
      }
      return false;
    },
    [handleConversationDissolved],
  );

  const markConversationReadSafe = useCallback(() => {
    if (!conversationId || dissolvedRef.current) return;
    const documentVisibility =
      Platform.OS === "web" && typeof document !== "undefined"
        ? document.visibilityState
        : undefined;
    if (
      !canMarkConversationRead({
        appState: AppState.currentState,
        documentVisibility,
        isFocused: isConversationFocusedRef.current,
      })
    ) {
      return;
    }
    void markConversationRead(conversationId)
      .then(() => {
        console.info("[ChatSync] conversation marked read", {
          conversationId,
          source: "api",
          timestamp: new Date().toISOString(),
          unreadCount: 0,
        });
        void syncChatUnreadCount("mark-read");
      })
      .catch(handleRoomApiError);
  }, [conversationId, handleRoomApiError]);

  const syncConversationReadVisibility = useCallback(
    (appState = AppState.currentState) => {
      const documentVisibility =
        Platform.OS === "web" && typeof document !== "undefined"
          ? document.visibilityState
          : undefined;
      const isVisible = canMarkConversationRead({
        appState,
        documentVisibility,
        isFocused: isConversationFocusedRef.current,
      });
      if (isVisible) {
        setActiveChatConversation(conversationId || null);
        markConversationReadSafe();
      } else if (getActiveChatConversation() === conversationId) {
        setActiveChatConversation(null);
      }
    },
    [conversationId, markConversationReadSafe],
  );

  useFocusEffect(
    useCallback(() => {
      isConversationFocusedRef.current = true;
      syncConversationReadVisibility();

      return () => {
        isConversationFocusedRef.current = false;
        if (getActiveChatConversation() === conversationId) {
          setActiveChatConversation(null);
        }
      };
    }, [conversationId, syncConversationReadVisibility]),
  );

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      syncConversationReadVisibility,
    );
    const handleVisibilityChange = () => syncConversationReadVisibility();
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      appStateSubscription.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [syncConversationReadVisibility]);

  const scrollToMessage = useCallback(
    (messageId: string) => {
      if (!messageId) return false;
      const index = messages.findIndex((item) => item.id === messageId);
      if (index < 0) return false;
      listRef.current?.scrollToIndex({
        animated: true,
        index,
        viewPosition: 0.5,
      });
      return true;
    },
    [messages],
  );

  const load = useCallback(
    async (nextPage: number, mode: "initial" | "background" | "more") => {
      if (!conversationId) return;
      if (dissolvedRef.current) return;
      const requestedConversationId = conversationId;
      if (mode === "initial") {
        setIsLoading(true);
        setMessageLoadingState(requestedConversationId, { initialLoading: true });
      }
      if (mode === "background") {
        setIsBackgroundRefreshing(true);
        setMessageLoadingState(requestedConversationId, { backgroundRefreshing: true });
      }
      if (mode === "more") {
        setIsLoadingMore(true);
        setMessageLoadingState(requestedConversationId, { loadingMore: true });
      }
      try {
        if (mode === "more") {
          const current = getCachedMessages(requestedConversationId);
          if (current.length >= MAX_MESSAGES_PER_CONVERSATION) {
            const capped = setCachedMessageHasNoMore(requestedConversationId);
            setTotalPages(capped.totalPages);
            return;
          }
          const oldest = current.at(-1);
          if (oldest) {
            const localItems = await readOlderLocalMessages(
              requestedConversationId,
              oldest,
              CHAT_PAGE_SIZE,
            );
            if (localItems.length > 0) {
              const currentEntry = getMessageCache(requestedConversationId);
              const cached = setCachedMessagePage(
                requestedConversationId,
                localItems,
                nextPage,
                Math.max(currentEntry?.totalPages ?? 1, nextPage + (localItems.length === CHAT_PAGE_SIZE ? 1 : 0)),
                currentEntry?.lastFetchedAt ?? 0,
              );
              if (activeConversationIdRef.current !== requestedConversationId) return;
              setMessageState(cached.messages);
              setPage(cached.page);
              setTotalPages(cached.totalPages);
              if (localItems.length === CHAT_PAGE_SIZE) return;
            }
          }
        }
        const currentMessages = getCachedMessages(requestedConversationId);
        const newestConfirmed = currentMessages.find((message) =>
          !message.id.startsWith("pending-") && message.sendStatus !== "sending" && message.sendStatus !== "failed",
        );
        const oldestConfirmed = [...currentMessages].reverse().find((message) =>
          !message.id.startsWith("pending-") && message.sendStatus !== "sending" && message.sendStatus !== "failed",
        );
        let result = await getConversationMessages(requestedConversationId, {
          afterMessageId: mode === "background" ? newestConfirmed?.id : undefined,
          beforeMessageId: mode === "more" ? oldestConfirmed?.id : undefined,
          page: nextPage,
          pageSize: CHAT_PAGE_SIZE,
        });
        const resultItems = [...result.items];
        let deltaBatches = 1;
        while (
          mode === "background" &&
          result.items.length === CHAT_PAGE_SIZE &&
          deltaBatches < 10
        ) {
          const nextCursor = result.items.at(-1)?.id;
          if (!nextCursor) break;
          result = await getConversationMessages(requestedConversationId, {
            afterMessageId: nextCursor,
            page: 1,
            pageSize: CHAT_PAGE_SIZE,
          });
          resultItems.push(...result.items);
          deltaBatches += 1;
        }
        const nextItems = toNewestFirstMessages(
          resultItems.map(normalizeMessage),
        );
        const cached = setCachedMessagePage(
          requestedConversationId,
          nextItems,
          mode === "more" ? nextPage : result.page,
          mode === "more"
            ? nextPage + (nextItems.length === CHAT_PAGE_SIZE ? 1 : 0)
            : mode === "background"
              ? getMessageCache(requestedConversationId)?.totalPages ?? result.totalPages
              : result.totalPages,
        );
        void persistLocalMessages(nextItems);
        if (activeConversationIdRef.current !== requestedConversationId) return;
        if (result.conversation) {
          setMessagePermissions((current) => ({
            canSendMessage:
              typeof result.conversation?.canSendMessage === "boolean"
                ? result.conversation.canSendMessage
                : current?.canSendMessage ?? true,
            onlyAdminCanSend:
              typeof result.conversation?.onlyAdminCanSend === "boolean"
                ? result.conversation.onlyAdminCanSend
                : current?.onlyAdminCanSend ?? false,
          }));
          setConversationDetails((current) => ({
            ...(current ?? {
              avatarUrl: params.conversationAvatarUrl || null,
              conversationType:
                result.conversation?.conversationType ??
                params.conversationType ??
                "Private",
              id: conversationId,
              isMuted: params.isMuted === "true",
              isPinned: params.isPinned === "true",
              lastMessage: null,
              name: params.conversationName ?? "Chat",
              otherParticipant: null,
              unreadCount: 0,
            }),
            ...result.conversation,
          }));
          setIsBlocked(result.conversation.isBlocked === true);
          setBlockedBy(result.conversation.blockedBy ?? null);
        }
        setMessageState(cached.messages);
        setPage(cached.page);
        setTotalPages(cached.totalPages);
        if (nextPage === 1) markConversationReadSafe();
      } catch (error) {
        if (activeConversationIdRef.current !== requestedConversationId) return;
        if (handleRoomApiError(error)) return;
        if (mode === "background" && getCachedMessages(requestedConversationId).length > 0) {
          if (__DEV__) console.info("[CHAT SYNC] background refresh failed", error);
          return;
        }
        Alert.alert(
          "Không thể tải tin nhắn",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        if (activeConversationIdRef.current === requestedConversationId) {
          setIsLoading(false);
          setIsBackgroundRefreshing(false);
          setIsLoadingMore(false);
          setMessageLoadingState(requestedConversationId, {
            backgroundRefreshing: false,
            initialLoading: false,
            loadingMore: false,
          });
        }
      }
    },
    [conversationId, handleRoomApiError, markConversationReadSafe, normalizeMessage],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isGroupConversation) return;
      void load(1, "background");
    }, [isGroupConversation, load]),
  );

  const scrollToReplyMessage = useCallback(
    async (messageId: string) => {
      if (scrollToMessage(messageId)) return;
      if (!conversationId || page >= totalPages || isLoadingMore) {
        Alert.alert("Không tìm thấy tin nhắn", "Tin nhắn gốc chưa có trong phòng chat.");
        return;
      }

      const nextPage = page + 1;
      const requestedConversationId = conversationId;
      setIsLoadingMore(true);
      try {
        const result = await getConversationMessages(requestedConversationId, {
          page: nextPage,
          pageSize: CHAT_PAGE_SIZE,
        });
        const olderMessages = toNewestFirstMessages(
          result.items.map(normalizeMessage),
        );
        const cached = setCachedMessagePage(
          requestedConversationId,
          olderMessages,
          result.page,
          result.totalPages,
        );
        if (activeConversationIdRef.current !== requestedConversationId) return;
        setMessageState(cached.messages);
        setPage(cached.page);
        setTotalPages(cached.totalPages);

        const nextIndex = cached.messages.findIndex((item) => item.id === messageId);
        if (nextIndex >= 0) {
          requestAnimationFrame(() =>
            listRef.current?.scrollToIndex({
              animated: true,
              index: nextIndex,
              viewPosition: 0.5,
            }),
          );
          return;
        }

        Alert.alert("Không tìm thấy tin nhắn", "Hãy kéo lên tải thêm tin cũ rồi thử lại.");
      } catch (error) {
        if (activeConversationIdRef.current !== requestedConversationId) return;
        if (handleRoomApiError(error)) return;
        Alert.alert(
          "Không thể tải tin nhắn gốc",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        if (activeConversationIdRef.current === requestedConversationId) {
          setIsLoadingMore(false);
        }
      }
    },
    [
      conversationId,
      handleRoomApiError,
      isLoadingMore,
      normalizeMessage,
      page,
      scrollToMessage,
      totalPages,
    ],
  );

  useEffect(() => {
    dissolvedRef.current = false;
    setMessagePermissions(null);
    setConversationDetails(initialConversationDetails);
    if (conversationId) {
      void joinRealtimeGroup(getRealtimeConversationGroupName(conversationId)).catch(
        (error) => {
          console.info(
            "[Realtime] JoinGroup failed",
            error instanceof Error ? error.message : String(error),
          );
        },
      );
    }
    return () => {
      if (conversationId) {
        void leaveRealtimeGroup(getRealtimeConversationGroupName(conversationId)).catch(
          (error) => {
            console.info(
              "[Realtime] LeaveGroup failed",
              error instanceof Error ? error.message : String(error),
            );
          },
        );
      }
    };
  }, [conversationId, initialConversationDetails]);

  useEffect(() => {
    getUser().then((user) => setCurrentUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    let active = true;
    const cached = getMessageCache(conversationId);
    setMessageState(cached?.messages ?? []);
    setPage(cached?.page ?? 1);
    setTotalPages(cached?.totalPages ?? 1);
    setIsLoading(!cached?.initialized);
    setIsLoadingMore(false);
    setIsBackgroundRefreshing(false);

    void (async () => {
      let hydrated = cached;
      if (!cached?.initialized) {
        const localMessages = await readRecentLocalMessages(conversationId, CHAT_PAGE_SIZE);
        if (!active || activeConversationIdRef.current !== conversationId) return;
        if (localMessages.length > 0) {
          hydrated = setCachedMessagePage(
            conversationId,
            localMessages,
            1,
            localMessages.length === CHAT_PAGE_SIZE ? 2 : 1,
            0,
          );
          setMessageState(hydrated.messages);
          setPage(hydrated.page);
          setTotalPages(hydrated.totalPages);
          setIsLoading(false);
        }
      }

      if (isMessageCacheStale(conversationId)) {
        void load(1, hydrated?.initialized ? "background" : "initial");
      } else {
        markConversationReadSafe();
      }
    })();
    return () => { active = false; };
  }, [conversationId, load, markConversationReadSafe]);

  useEffect(() => {
    if (!conversationId) return;
    if (params.conversationName && params.conversationType) return;
    let isMounted = true;
    void getConversation(conversationId)
      .then((conversation) => {
        if (!isMounted) return;
        setConversationDetails((current) => ({
          ...conversation,
          canSendMessage:
            conversation.canSendMessage ?? current?.canSendMessage,
          onlyAdminCanSend:
            conversation.onlyAdminCanSend ?? current?.onlyAdminCanSend,
        }));
        setIsBlocked(conversation.isBlocked === true);
        setBlockedBy(conversation.blockedBy ?? null);
      })
      .catch((error) => {
        if (handleRoomApiError(error)) return;
        if (isMounted) setConversationDetails(null);
      });
    return () => {
      isMounted = false;
    };
  }, [conversationId, handleRoomApiError, params.conversationName, params.conversationType]);

  useEffect(
    () =>
      subscribeRealtimeMessages((message) => {
        if (message.conversationId !== conversationId) return;
        const normalizedMessage = normalizeMessage(message);
        const nextMessage =
          isMessageFromCurrentUser(normalizedMessage.sender.id, currentUserId)
            ? { ...normalizedMessage, isMine: true }
            : normalizedMessage;
        if (nextMessage.isMine && pendingOutgoingIdsRef.current.size > 0) {
          bufferedMineMessagesRef.current.set(nextMessage.id, nextMessage);
          return;
        }
        setMessages((current) =>
          current.some((item) => item.id === nextMessage.id)
            ? current.map((item) =>
                item.id === nextMessage.id
                  ? {
                      ...item,
                      ...nextMessage,
                      clientRenderId: item.clientRenderId,
                      sendStatus: nextMessage.sendStatus ?? item.sendStatus,
                    }
                  : item,
              )
            : [nextMessage, ...current],
        );
        if (!nextMessage.isMine) markConversationReadSafe();
        if (isAtBottomRef.current || nextMessage.isMine) {
          scrollToEndAfterLayout(true);
        } else {
          setHasNewMessage(true);
        }
      }),
    [conversationId, currentUserId, markConversationReadSafe, normalizeMessage, scrollToEndAfterLayout, setMessages],
  );

  useEffect(
    () =>
      subscribeRealtimeConversationDissolved((event) => {
        if (event.conversationId !== conversationId) return;
        handleConversationDissolved();
      }),
    [conversationId, handleConversationDissolved],
  );

  useEffect(
    () =>
      subscribeRealtimeMessageDelivered((event) => {
        if (event.conversationId !== conversationId) return;
        setMessages((current) =>
          current.map((item) =>
            item.id === event.messageId ? { ...item, isMine: true } : item,
          ),
        );
      }),
    [conversationId, setMessages],
  );

  useEffect(
    () =>
      subscribeRealtimeMessageDeleted((event) => {
        if (event.conversationId !== conversationId) return;
        setMessages((current) =>
          current.map((item) =>
            item.id === event.messageId
              ? markMessageRecalled(item, event.deletedBy)
              : item,
          ),
        );
      }),
    [conversationId, setMessages],
  );

  useEffect(
    () =>
      subscribeRealtimeConversationBlockedChanges((event) => {
        if (event.conversationId !== conversationId) return;
        setIsBlocked(event.isBlocked);
        if (!event.isBlocked) setBlockedBy(null);
      }),
    [conversationId],
  );

  useEffect(() => {
    const messageId = params.scrollToMessageId;
    if (!messageId || messages.length === 0) return;
    if (!scrollToMessage(messageId)) return;
    setHighlightedMessageId(messageId);
    const timer = setTimeout(() => setHighlightedMessageId(null), 2000);
    return () => clearTimeout(timer);
  }, [messages.length, params.scrollToMessageId, scrollToMessage]);

  const title = useMemo(() => {
    if (params.conversationName) return params.conversationName;
    if (conversationDetails) {
      return conversationDetails.conversationType === "Private"
        ? (conversationDetails.otherParticipant?.displayName ??
            conversationDetails.name)
        : conversationDetails.name;
    }
    const other = messages.find((item) => !item.isMine)?.sender.displayName;
    return other ?? "Chat";
  }, [conversationDetails, messages, params.conversationName]);

  const {
    canAddMembers,
    canSendInConversation,
    conversationType,
    currentUserRole,
    shouldRenderComposer,
    showAdminOnlyMessage,
  } = useChatPermissions({
    conversationDetails,
    isBlocked,
    messagePermissions,
    paramsConversationType: params.conversationType,
    paramsRole: params.role,
  });

  const blockedComposerMessage = useMemo(() => {
    if (!isBlocked) return "";
    if (blockedBy?.id && blockedBy.id === currentUserId) {
      return "Bạn đã chặn cuộc trò chuyện này.";
    }
    const blockerName = blockedBy?.displayName?.trim();
    return blockerName
      ? `${blockerName} đã chặn cuộc trò chuyện này.`
      : "Cuộc trò chuyện này đã bị chặn.";
  }, [blockedBy, currentUserId, isBlocked]);

  useEffect(() => {
    if (canSendInConversation || isBlocked) return;
    setAttachments([]);
    setReplyTo(null);
    setShowStickers(false);
    if (recorderState.isRecording) {
      void recorder.stop();
    }
  }, [canSendInConversation, isBlocked, recorder, recorderState.isRecording]);

  const openSettings = useCallback(() => {
    const otherMessage = messages.find((item) => !item.isMine);
    const otherParticipant = conversationDetails?.otherParticipant;
    router.push({
      pathname: "/chat/settings/[conversationId]",
      params: {
        conversationAvatarUrl:
          params.conversationAvatarUrl ||
          conversationDetails?.avatarUrl ||
          otherParticipant?.avatarUrl ||
          params.otherAvatarUrl ||
          otherMessage?.sender.avatarUrl ||
          "",
        conversationId,
        conversationName: title,
        conversationType:
          conversationDetails?.conversationType ??
          params.conversationType ??
          "Private",
        isMuted: params.isMuted ?? String(conversationDetails?.isMuted ?? false),
        isPinned: params.isPinned ?? String(conversationDetails?.isPinned ?? false),
        isVerified:
          params.isVerified ??
          String(otherParticipant?.isVerified ?? otherMessage?.sender.isVerified ?? false),
        memberCount:
          params.memberCount ?? String(conversationDetails?.memberCount ?? ""),
        otherAvatarUrl:
          params.otherAvatarUrl ||
          otherParticipant?.avatarUrl ||
          otherMessage?.sender.avatarUrl ||
          "",
        otherUserId:
          params.otherUserId || otherParticipant?.id || otherMessage?.sender.id || "",
        otherUserName:
          params.otherUserName ||
          otherParticipant?.displayName ||
          otherMessage?.sender.displayName ||
          title,
        role: params.role ?? String(conversationDetails?.role ?? 0),
      },
    });
  }, [
    conversationDetails,
    conversationId,
    messages,
    params.conversationAvatarUrl,
    params.conversationType,
    params.isMuted,
    params.isPinned,
    params.isVerified,
    params.memberCount,
    params.otherAvatarUrl,
    params.otherUserId,
    params.otherUserName,
    params.role,
    title,
  ]);

  const refreshConversationDetails = useCallback(() => {
    if (!conversationId) return;
    void getConversation(conversationId)
      .then((conversation) => {
        setConversationDetails((current) => ({
          ...conversation,
          canSendMessage:
            conversation.canSendMessage ?? current?.canSendMessage,
          onlyAdminCanSend:
            conversation.onlyAdminCanSend ?? current?.onlyAdminCanSend,
        }));
        setIsBlocked(conversation.isBlocked === true);
        setBlockedBy(conversation.blockedBy ?? null);
      })
      .catch((error) => {
        if (handleRoomApiError(error)) return;
      });
  }, [conversationId, handleRoomApiError]);

  const addImagePickerAssets = useCallback(
    (assets: ImagePicker.ImagePickerAsset[]) => {
      setAttachments((current) => [
        ...current,
        ...assets.map((asset, index) => ({
          id: `${asset.uri}-${Date.now()}-${index}`,
          file: asset.file,
          kind:
            asset.type === "video" ? ("video" as const) : ("image" as const),
          name: asset.fileName ?? `attachment-${Date.now()}-${index}`,
          type:
            asset.mimeType ??
            (asset.type === "video" ? "video/mp4" : "image/jpeg"),
          size: asset.fileSize,
          duration: asset.duration
            ? Math.round(asset.duration / 1000)
            : undefined,
          uri: asset.uri,
        })),
      ]);
    },
    [],
  );

  const pickMedia = useCallback(async (mediaTypes: ImagePicker.MediaType[]) => {
    if (!canSendInConversation) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes,
      quality: 0.85,
    });
    if (result.canceled) return;
    addImagePickerAssets(result.assets);
  }, [addImagePickerAssets, canSendInConversation]);

  const takePhoto = useCallback(async () => {
    if (!canSendInConversation) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Không thể chụp ảnh", "Ứng dụng chưa có quyền dùng camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled) return;
    addImagePickerAssets(result.assets);
  }, [addImagePickerAssets, canSendInConversation]);

  const pickFiles = useCallback(async () => {
    if (!canSendInConversation) return;
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    setAttachments((current) => [
      ...current,
      ...result.assets.map((asset, index) => ({
        id: `${asset.uri}-${Date.now()}-${index}`,
        file: asset.file,
        kind: asset.mimeType?.startsWith("audio/")
          ? ("audio" as const)
          : ("file" as const),
        name: asset.name,
        size: asset.size,
        type: asset.mimeType ?? "application/octet-stream",
        uri: asset.uri,
      })),
    ]);
  }, [canSendInConversation]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }, []);

  const handleMessageInputContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const contentHeight = event.nativeEvent.contentSize.height;
      setMessageInputHeight(getMessageInputHeight(contentHeight));
      setIsMessageInputScrollableState(
        isMessageInputScrollable(contentHeight),
      );
    },
    [],
  );

  const handleMessageInputChange = useCallback((value: string) => {
    setContent(value);
    if (value.length > 0) return;
    setMessageInputHeight(MIN_MESSAGE_INPUT_HEIGHT);
    setIsMessageInputScrollableState(false);
  }, []);

  const dismissComposerPanels = useCallback(() => {
    setShowChatTools(false);
    setShowStickers(false);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (!canSendInConversation && !recorderState.isRecording) return;
    try {
      if (recorderState.isRecording) {
        const durationMillis = recorderState.durationMillis;
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          const attachment = await createRecordedChatAttachment({
            durationMillis,
            platform: Platform.OS,
            uri,
          });
          setAttachments((current) => [...current, attachment]);
        }
        await setAudioModeAsync({ allowsRecording: false });
        return;
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Không thể ghi âm", "Ứng dụng chưa có quyền dùng micro.");
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      Alert.alert(
        "Không thể ghi âm",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  }, [canSendInConversation, recorder, recorderState.durationMillis, recorderState.isRecording]);

  const shareLocation = useCallback(async () => {
    if (!canSendInConversation) return;
    let pendingLocationId = "";
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Không thể chia sẻ vị trí", "Ứng dụng chưa có quyền vị trí.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      const optimisticId = `pending-location-${Date.now()}`;
      pendingLocationId = optimisticId;
      const currentUser = await getUser();
      const optimisticMessage: ChatMessage = {
        attachments: [],
        content: url,
        conversationId,
        createdAt: new Date().toISOString(),
        id: optimisticId,
        isDeleted: false,
        isEdited: false,
        isMine: true,
        messageType: 0,
        reactions: [],
        reply: null,
        sendStatus: "sending",
        sender: {
          avatarUrl: currentUser?.avatarUrl ?? null,
          displayName: currentUser?.displayName ?? "Báº¡n",
          id: currentUser?.id ?? "current-user",
          isVerified: currentUser?.isVerified,
        },
      };

      pendingOutgoingIdsRef.current.add(optimisticId);
      setMessageRetry(conversationId, optimisticId, {
        attachments: [],
        content: url,
        conversationId,
      });
      setMessages((current) => [optimisticMessage, ...current]);
      scrollToEndAfterLayout(true);

      const message = await sendChatMessage({
        attachments: [],
        content: url,
        conversationId,
      });
      const sentMessage = {
        ...normalizeMessage(message),
        clientRenderId: optimisticId,
        isMine: true,
        sendStatus: "sent" as const,
      };
      setMessages((current) => {
        if (!current.some((item) => item.id === optimisticId)) {
          return current.some((item) => item.id === sentMessage.id)
            ? current
            : [sentMessage, ...current];
        }
        return current
          .filter(
            (item) => item.id === optimisticId || item.id !== sentMessage.id,
          )
          .map((item) =>
            item.id === optimisticId ? sentMessage : item,
          );
      });
      deleteMessageRetry(conversationId, optimisticId);
      finishPendingOutgoing(optimisticId, sentMessage.id);
      scrollToEndAfterLayout(true);
    } catch (error) {
      if (pendingLocationId) {
        finishPendingOutgoing(pendingLocationId);
        setMessages((current) =>
          current.map((item) =>
            item.id === pendingLocationId ? { ...item, sendStatus: "failed" } : item,
          ),
        );
      }
      Alert.alert(
        "Không thể lấy vị trí",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  }, [canSendInConversation, conversationId, finishPendingOutgoing, normalizeMessage, scrollToEndAfterLayout, setMessages]);

  const recallMessage = useCallback(
    async (message: ChatMessage) => {
      if (!message.isMine || message.isDeleted || message.id.startsWith("pending-")) {
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? markMessageRecalled(item) : item,
        ),
      );

      try {
        const result = await recallChatMessage(message.id);
        setMessages((current) =>
          current.map((item) =>
            item.id === result.messageId
              ? markMessageRecalled(item, result.deletedBy)
              : item,
          ),
        );
      } catch (error) {
        if (handleRoomApiError(error)) return;
        setMessages((current) =>
          current.map((item) => (item.id === message.id ? message : item)),
        );
        Alert.alert(
          "Không thể thu hồi tin nhắn",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      }
    },
    [handleRoomApiError, setMessages],
  );

  const closeMessageActions = useCallback(() => {
    setActionMessageId(null);
    setActionAttachment(null);
  }, []);

  const openMessageActions = useCallback((
    message: ChatMessage,
    attachment?: ChatAttachment,
  ) => {
    if (message.messageType === MessageType.System) return;
    setActionMessageId(message.id);
    setActionAttachment(attachment ?? null);
  }, []);

  const downloadAttachment = useCallback(async (attachment: ChatAttachment) => {
    if (downloadingAttachmentId === attachment.id) return;
    setDownloadingAttachmentId(attachment.id);
    try {
      const result = await downloadChatAttachment(attachment);
      showAppToast({
        message: `Đã tải ${result.fileName}`,
        type: "success",
      });
    } catch (error) {
      showAppToast({
        message: error instanceof Error ? error.message : "Không thể tải tệp. Vui lòng thử lại.",
        type: "error",
      });
    } finally {
      setDownloadingAttachmentId(null);
    }
  }, [downloadingAttachmentId]);

  const forwardMessage = useCallback((message: ChatMessage) => {
    if (
      message.messageType === MessageType.System ||
      message.id.startsWith("pending-")
    ) {
      return;
    }
    router.push({
      pathname: "/chat/forward-message",
      params: { messageId: message.id },
    });
  }, []);

  const send = useCallback(async () => {
    if (!canSendInConversation) return;
    if (dissolvedRef.current) return;
    if (!content.trim() && attachments.length === 0) return;
    const draftContent = content.trim();
    const mentionUserIds = activeMentionIds(content, draftMentions);
    const draftAttachments = attachments;
    const draftReply = replyTo;
    const currentUser = await getUser();
    const sendUnits = buildChatSendUnits(draftContent, draftAttachments);
    const pendingMessages = sendUnits.map((unit, index) => {
      const attachment = unit.attachments[0];
      const optimisticId = `pending-${Date.now()}-${index}`;
      const optimisticMessage: ChatMessage = {
        attachments: unit.attachments.map(pendingAttachmentToViewerAttachment),
        content: unit.content,
        conversationId,
        createdAt: new Date().toISOString(),
        id: optimisticId,
        isDeleted: false,
        isEdited: false,
        isMine: true,
        messageType:
          !attachment
            ? 0
            : attachment.kind === "image"
              ? 1
              : attachment.kind === "video"
                ? 2
                : attachment.kind === "audio"
                  ? 4
                  : 3,
        reactions: [],
        reply: index === 0 && draftReply
          ? {
              content: draftReply.content || "Tệp đính kèm",
              id: draftReply.id,
              senderName: draftReply.sender.displayName,
            }
          : null,
        sendStatus: "sending",
        sender: {
          avatarUrl: currentUser?.avatarUrl ?? null,
          displayName: currentUser?.displayName ?? "Bạn",
          id: currentUser?.id ?? "current-user",
          isVerified: currentUser?.isVerified,
        },
      };
      return { optimisticId, optimisticMessage, unit, unitIndex: index };
    });

    pendingMessages.forEach(({ optimisticId }) =>
      pendingOutgoingIdsRef.current.add(optimisticId),
    );
    pendingMessages.forEach(({ optimisticId, unit, unitIndex }) =>
      setMessageRetry(conversationId, optimisticId, {
        attachments: unit.attachments,
        content: unit.content,
        conversationId,
        mentionUserIds: unit.content ? mentionUserIds : undefined,
        replyToMessageId: unitIndex === 0 ? draftReply?.id : undefined,
      }),
    );
    setMessages((current) => [
      ...pendingMessages.map(({ optimisticMessage }) => optimisticMessage).reverse(),
      ...current,
    ]);
    setContent("");
    setMessageInputHeight(MIN_MESSAGE_INPUT_HEIGHT);
    setIsMessageInputScrollableState(false);
    setDraftMentions([]);
    setAttachments([]);
    setReplyTo(null);
    scrollToEndAfterLayout(true);
    let hasShownUploadError = false;
    for (const { optimisticId, unit, unitIndex } of pendingMessages) {
      try {
        const message = await sendChatMessage({
          attachments: unit.attachments,
          content: unit.content,
          conversationId,
          replyToMessageId: unitIndex === 0 ? draftReply?.id : undefined,
          mentionUserIds: unit.content ? mentionUserIds : undefined,
        });
        const sentMessage = {
          ...normalizeMessage(message),
          clientRenderId: optimisticId,
          isMine: true,
          sendStatus: "sent" as const,
        };
        setMessages((current) => {
          if (!current.some((item) => item.id === optimisticId)) {
            return current.some((item) => item.id === sentMessage.id)
              ? current
              : [sentMessage, ...current];
          }
          return current
            .filter(
              (item) => item.id === optimisticId || item.id !== sentMessage.id,
            )
            .map((item) =>
              item.id === optimisticId ? sentMessage : item,
            );
        });
        deleteMessageRetry(conversationId, optimisticId);
        finishPendingOutgoing(optimisticId, sentMessage.id);
      } catch (error) {
        finishPendingOutgoing(optimisticId);
        if (handleRoomApiError(error)) {
          pendingMessages.forEach(({ optimisticId: pendingId }) =>
            finishPendingOutgoing(pendingId),
          );
          const pendingIds = new Set(
            pendingMessages.map(({ optimisticId: pendingId }) => pendingId),
          );
          pendingIds.forEach((pendingId) =>
            deleteMessageRetry(conversationId, pendingId),
          );
          setMessages((current) =>
            current.filter((item) => !pendingIds.has(item.id)),
          );
          return;
        }
        setMessages((current) =>
          current.map((item) =>
            item.id === optimisticId ? { ...item, sendStatus: "failed" } : item,
          ),
        );
        if (error instanceof ChatAttachmentUploadError && !hasShownUploadError) {
          hasShownUploadError = true;
          Alert.alert("Không thể tải tệp đính kèm", error.message);
        }
      }
    }
    scrollToEndAfterLayout(true);
  }, [attachments, canSendInConversation, content, conversationId, draftMentions, finishPendingOutgoing, handleRoomApiError, normalizeMessage, replyTo, scrollToEndAfterLayout, setMessages]);

  const sendSticker = useCallback(async (sticker: Sticker) => {
    if (!canSendInConversation || dissolvedRef.current) return;
    const optimisticId = `pending-sticker-${Date.now()}`;
    const currentUser = await getUser();
    const optimisticMessage: ChatMessage = {
      attachments: [], content: "", conversationId,
      createdAt: new Date().toISOString(), id: optimisticId,
      isDeleted: false, isEdited: false, isMine: true,
      messageType: MessageType.Sticker, reactions: [], reply: null,
      sendStatus: "sending",
      sender: {
        avatarUrl: currentUser?.avatarUrl ?? null,
        displayName: currentUser?.displayName ?? "Bạn",
        id: currentUser?.id ?? "current-user",
        isVerified: currentUser?.isVerified,
      },
      sticker,
    };
    pendingOutgoingIdsRef.current.add(optimisticId);
    setMessageRetry(conversationId, optimisticId, {
      attachments: [],
      content: "",
      conversationId,
      stickerId: sticker.id,
    });
    setMessages((current) => [optimisticMessage, ...current]);
    scrollToEndAfterLayout(true);
    try {
      const message = await sendChatMessage({ attachments: [], content: "", conversationId, stickerId: sticker.id });
      const sentMessage = { ...normalizeMessage(message), clientRenderId: optimisticId, isMine: true, sendStatus: "sent" as const };
      setMessages((current) => current
        .filter((item) => item.id === optimisticId || item.id !== sentMessage.id)
        .map((item) => item.id === optimisticId ? sentMessage : item));
      deleteMessageRetry(conversationId, optimisticId);
      finishPendingOutgoing(optimisticId, sentMessage.id);
      await rememberSticker(sticker);
      scrollToEndAfterLayout(true);
    } catch (error) {
      finishPendingOutgoing(optimisticId);
      setMessages((current) => current.map((item) =>
        item.id === optimisticId ? { ...item, sendStatus: "failed" } : item,
      ));
      if (!handleRoomApiError(error)) {
        Alert.alert("Không thể gửi nhãn dán", error instanceof Error ? error.message : "Vui lòng thử lại.");
      }
    }
  }, [canSendInConversation, conversationId, finishPendingOutgoing, handleRoomApiError, normalizeMessage, scrollToEndAfterLayout, setMessages]);

  const retryMessage = useCallback(async (failedMessage: ChatMessage) => {
    const retry = getMessageRetry(conversationId, failedMessage.id);
    if (!retry || failedMessage.sendStatus !== "failed") return;

    pendingOutgoingIdsRef.current.add(failedMessage.id);
    setMessages((current) => current.map((item) =>
      item.id === failedMessage.id ? { ...item, sendStatus: "sending" } : item,
    ));

    try {
      const message = await sendChatMessage(retry);
      const sentMessage = {
        ...normalizeMessage(message),
        clientRenderId: failedMessage.id,
        isMine: true,
        sendStatus: "sent" as const,
      };
      setMessages((current) => current
        .filter((item) => item.id === failedMessage.id || item.id !== sentMessage.id)
        .map((item) => item.id === failedMessage.id ? sentMessage : item));
      deleteMessageRetry(conversationId, failedMessage.id);
      finishPendingOutgoing(failedMessage.id, sentMessage.id);
      if (failedMessage.sticker) {
        await rememberSticker({ ...failedMessage.sticker, sortOrder: 0 });
      }
      scrollToEndAfterLayout(true);
    } catch (error) {
      finishPendingOutgoing(failedMessage.id);
      setMessages((current) => current.map((item) =>
        item.id === failedMessage.id ? { ...item, sendStatus: "failed" } : item,
      ));
      if (!handleRoomApiError(error)) {
        Alert.alert(
          "Không thể gửi lại tin nhắn",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      }
    }
  }, [conversationId, finishPendingOutgoing, handleRoomApiError, normalizeMessage, scrollToEndAfterLayout, setMessages]);

  const startCall = useCallback(async (callType: CallType) => {
    if (!conversationDetails || isStartingCall) return;
    if (conversationDetails.conversationType === "Group") {
      try {
        setIsStartingCall(true);
        const join = await startGroupCall(conversationId, CallType.Video);
        setActiveGroupCallId(join.call.id);
        router.push({
          pathname: "/group-call/[callId]",
          params: { callId: join.call.id },
        });
      } catch (error) {
        Alert.alert(
          "Không thể gọi nhóm",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        setIsStartingCall(false);
      }
      return;
    }
    if (activeVoiceCall) {
      router.push({
        pathname: "/call/[callId]",
        params: {
          avatarUrl: activeVoiceCall.avatarUrl ?? "",
          callId: activeVoiceCall.callId,
          callType: String(activeVoiceCall.callType),
          conversationId: activeVoiceCall.conversationId,
          displayName: activeVoiceCall.displayName,
          mode: activeVoiceCall.mode,
        },
      });
      return;
    }
    try {
      setIsStartingCall(true);
      await startCallRealtime();
      const callId = await createVoiceCall(conversationId, callType);
      const otherMessage = messages.find((item) => !item.isMine);
      const peerAvatarUrl =
        conversationDetails.otherParticipant?.avatarUrl ||
        params.otherAvatarUrl ||
        params.conversationAvatarUrl ||
        conversationDetails.avatarUrl ||
        otherMessage?.sender.avatarUrl ||
        "";
      const peerDisplayName =
        conversationDetails.otherParticipant?.displayName ||
        params.otherUserName ||
        otherMessage?.sender.displayName ||
        title;
      router.push({
        pathname: "/call/[callId]",
        params: {
          avatarUrl: peerAvatarUrl,
          callId,
          callType: String(callType),
          conversationId,
          displayName: peerDisplayName,
          mode: "caller",
        },
      });
    } catch (error) {
      Alert.alert("Không thể gọi", error instanceof Error ? error.message : "Vui lòng thử lại.");
    } finally {
      setIsStartingCall(false);
    }
  }, [
    activeVoiceCall,
    conversationDetails,
    conversationId,
    isStartingCall,
    messages,
    params.conversationAvatarUrl,
    params.otherAvatarUrl,
    params.otherUserName,
    title,
  ]);
  const startVoiceCall = useCallback(() => startCall(CallType.Audio), [startCall]);
  const startVideoCall = useCallback(() => startCall(CallType.Video), [startCall]);

  useEffect(() => subscribeActiveVoiceCall(setActiveVoiceCallState), []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled={isKeyboardVisible}
      keyboardVerticalOffset={0}
      style={styles.screen}
    >
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(spacing.xl, insets.top + spacing.md) },
        ]}
      >
        <Pressable
          accessibilityLabel="Quay lại"
          hitSlop={10}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace("/(tabs)/chat");
          }}
          style={styles.iconButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        {conversationDetails && !conversationDetails.isBlocked ? (
          <>
            <Pressable
              accessibilityLabel="Gọi video"
              disabled={isStartingCall}
              hitSlop={10}
              onPress={startVideoCall}
              style={[styles.iconButton, isStartingCall ? styles.disabledIconButton : null]}
            >
              <Ionicons color={isStartingCall ? colors.textMuted : colors.primary} name="videocam" size={22} />
            </Pressable>
            {!isGroupConversation ? (
              <Pressable
                accessibilityLabel="Gọi thoại"
                disabled={isStartingCall}
                hitSlop={10}
                onPress={startVoiceCall}
                style={[styles.iconButton, isStartingCall ? styles.disabledIconButton : null]}
              >
                <Ionicons color={isStartingCall ? colors.textMuted : colors.primary} name="call" size={22} />
              </Pressable>
            ) : null}
          </>
        ) : null}
        {canAddMembers ? (
          <Pressable
            accessibilityLabel="Them thanh vien"
            hitSlop={10}
            onPress={() => setAddMembersVisible(true)}
            style={styles.iconButton}
          >
            <Ionicons color={colors.text} name="person-add" size={22} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Cài đặt cuộc trò chuyện"
          hitSlop={10}
          onPress={openSettings}
          style={styles.iconButton}
        >
          <Ionicons
            color={colors.text}
            name="ellipsis-horizontal"
            size={24}
          />
        </Pressable>
      </View>
      <AddMembersModal
        conversationId={conversationId}
        onAdded={refreshConversationDetails}
        onClose={() => setAddMembersVisible(false)}
        visible={addMembersVisible}
      />
      {isGroupConversation && activeGroupCallId ? (
        <Pressable
          accessibilityLabel="Tham gia cuộc gọi nhóm đang diễn ra"
          onPress={() =>
            router.push({
              pathname: "/group-call/[callId]",
              params: { callId: activeGroupCallId },
            })
          }
          style={styles.activeGroupCall}
        >
          <View style={styles.activeGroupCallIcon}>
            <Ionicons color={colors.primaryContrast} name="videocam" size={20} />
          </View>
          <View style={styles.activeGroupCallText}>
            <Text style={styles.activeGroupCallTitle}>
              Cuộc gọi nhóm đang diễn ra
            </Text>
            <Text style={styles.activeGroupCallSubtitle}>
              Chạm để tham gia
            </Text>
          </View>
          <Ionicons color={colors.primary} name="chevron-forward" size={20} />
        </Pressable>
      ) : null}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.messagesContent}
          data={messages}
          inverted
          keyExtractor={(item) => item.clientRenderId ?? item.id}
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator color={colors.primary} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>
                Hãy bắt đầu cuộc trò chuyện.
              </Text>
            </View>
          }
          onContentSizeChange={() => {
            if (!pendingScrollToEndRef.current) return;
            pendingScrollToEndRef.current = false;
            const animated = pendingScrollAnimatedRef.current;
            requestAnimationFrame(() =>
              listRef.current?.scrollToOffset({ animated, offset: 0 }),
            );
          }}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              animated: true,
              offset: Math.max(0, info.averageItemLength * info.index),
            });
            requestAnimationFrame(() =>
              listRef.current?.scrollToIndex({
                animated: true,
                index: info.index,
                viewPosition: 0.5,
              }),
            );
          }}
          onScroll={(event) => {
            const { contentOffset } = event.nativeEvent;
            const atBottom = contentOffset.y < 48;
            isAtBottomRef.current = atBottom;
            if (!atBottom) pendingScrollToEndRef.current = false;
            setIsAtBottom(atBottom);
            if (atBottom) setHasNewMessage(false);
          }}
          onEndReached={() => {
            if (!isLoadingMore && page < totalPages) load(page + 1, "more");
          }}
          onEndReachedThreshold={0.2}
          renderItem={({ item, index }) => {
            const nextOlder = messages[index + 1];
            const showAvatar =
              !nextOlder || nextOlder.sender.id !== item.sender.id;
            return (
              <MessageRow
                actionAttachment={actionMessageId === item.id ? actionAttachment : null}
                canReply={canSendInConversation}
                downloadingAttachmentId={downloadingAttachmentId}
                isActionsOpen={actionMessageId === item.id}
                isHighlighted={highlightedMessageId === item.id}
                message={item}
                onCloseActions={closeMessageActions}
                onDownloadAttachment={(attachment) => void downloadAttachment(attachment)}
                onMediaLayout={() => {
                  if (!pendingScrollToEndRef.current && !isAtBottomRef.current) return;
                  scrollToEndAfterLayout(true);
                }}
                onOpenActions={openMessageActions}
                onOpenAttachment={setViewingAttachment}
                onForward={forwardMessage}
                onRecall={(message) => void recallMessage(message)}
                onReply={setReplyTo}
                onReplyPress={scrollToReplyMessage}
                onRetry={(message) => void retryMessage(message)}
                showAvatar={showAvatar}
              />
            );
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />
      )}
      {hasNewMessage && (
        <Pressable
          onPress={() => {
            setHasNewMessage(false);
            isAtBottomRef.current = true;
            setIsAtBottom(true);
            listRef.current?.scrollToOffset({ animated: true, offset: 0 });
          }}
          style={[
            styles.newMessageButton,
            {
              bottom: isKeyboardVisible
                ? 132
                : 132 + Math.max(0, insets.bottom - spacing.sm),
            },
          ]}
        >
          <Text style={styles.newMessageText}>Có tin nhắn mới</Text>
        </Pressable>
      )}
      {(showChatTools || showStickers) && (
        <Pressable
          accessible={false}
          onPress={dismissComposerPanels}
          style={styles.composerDismissLayer}
        />
      )}
      {shouldRenderComposer ? (
      <View
        style={[
          styles.composer,
          {
            paddingBottom: isKeyboardVisible
              ? spacing.sm
              : Math.max(spacing.sm, insets.bottom),
          },
        ]}
      >
        {isBlocked ? (
          <ChatComposerNotice message={blockedComposerMessage} type="blocked" />
        ) : conversationType === "Group" && messagePermissions === null ? (
          <ChatComposerNotice
            message="Đang kiểm tra quyền gửi tin nhắn..."
            type="permission"
          />
        ) : !canSendInConversation ? (
          showAdminOnlyMessage ? (
            <View style={styles.permissionComposer}>
              <Text style={styles.permissionComposerText}>
                Chỉ quản trị viên mới có thể gửi tin nhắn.
              </Text>
            </View>
          ) : (
            <ChatComposerNotice
              message="Bạn không có quyền gửi tin nhắn trong nhóm này."
              type="permission"
            />
          )
        ) : (
          <>
        {replyTo && (
          <View style={styles.replyComposer}>
            <View style={styles.replyComposerText}>
              <Text numberOfLines={1} style={styles.replyName}>
                {replyTo.sender.displayName}
              </Text>
              <Text numberOfLines={1} style={styles.replyText}>
                {replyTo.content || "Tệp đính kèm"}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Đóng reply"
              onPress={() => setReplyTo(null)}
            >
              <Ionicons color={colors.textMuted} name="close" size={20} />
            </Pressable>
          </View>
        )}
        {attachments.length > 0 && (
          <Text numberOfLines={1} style={styles.attachmentSummary}>
            {attachments.length} tệp đã chọn
          </Text>
        )}
        <ScrollView
          contentContainerStyle={styles.attachmentPreviewList}
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={attachments.length === 0 && styles.hidden}
        >
          {attachments.map((attachment) => (
            <PendingAttachmentPreview
              attachment={attachment}
              key={attachment.id}
              onOpen={(selected) =>
                setViewingAttachment(
                  pendingAttachmentToViewerAttachment(selected),
                )
              }
              onRemove={removeAttachment}
            />
          ))}
        </ScrollView>
        {showStickers && (
          <StickerPanel
            onOpenStore={() => router.push("/sticker-store")}
            onSelect={(sticker) => void sendSticker(sticker)}
          />
        )}
        {showChatTools && (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Chụp ảnh nhanh"
            onPress={() => {
              setShowChatTools(false);
              takePhoto();
            }}
            style={styles.toolButton}
          >
            <View style={styles.toolIcon}>
              <Ionicons color={colors.primary} name="camera-outline" size={22} />
            </View>
            <Text style={styles.toolLabel}>Camera</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Chọn ảnh"
            onPress={() => {
              setShowChatTools(false);
              pickMedia(["images"]);
            }}
            style={styles.toolButton}
          >
            <View style={styles.toolIcon}>
              <Ionicons color={colors.primary} name="images-outline" size={22} />
            </View>
            <Text style={styles.toolLabel}>Ảnh</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Chọn video"
            onPress={() => {
              setShowChatTools(false);
              pickMedia(["videos"]);
            }}
            style={styles.toolButton}
          >
            <View style={styles.toolIcon}>
              <Ionicons color={colors.primary} name="videocam-outline" size={22} />
            </View>
            <Text style={styles.toolLabel}>Video</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Chọn tài liệu"
            onPress={() => {
              setShowChatTools(false);
              pickFiles();
            }}
            style={styles.toolButton}
          >
            <View style={styles.toolIcon}>
              <Ionicons
                color={colors.primary}
                name="document-text-outline"
                size={22}
              />
            </View>
            <Text style={styles.toolLabel}>Tài liệu</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={recorderState.isRecording ? "Dừng ghi âm" : "Ghi âm"}
            onPress={() => {
              setShowChatTools(false);
              toggleRecording();
            }}
            style={styles.toolButton}
          >
            <View
              style={[
                styles.toolIcon,
                recorderState.isRecording && styles.recordingButton,
              ]}
            >
              <Ionicons
                color={
                  recorderState.isRecording
                    ? colors.dangerContrast
                    : colors.primary
                }
                name={recorderState.isRecording ? "stop" : "mic-outline"}
                size={22}
              />
            </View>
            <Text
              style={[
                styles.toolLabel,
                recorderState.isRecording && styles.recordingToolLabel,
              ]}
            >
              Ghi âm
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Chia sẻ vị trí hiện tại"
            onPress={() => {
              setShowChatTools(false);
              shareLocation();
            }}
            style={styles.toolButton}
          >
            <View style={styles.toolIcon}>
              <Ionicons color={colors.primary} name="location-outline" size={22} />
            </View>
            <Text style={styles.toolLabel}>Vị trí</Text>
          </Pressable>
        </View>
        )}
        {recorderState.isRecording && (
          <Text style={styles.recordingText}>
            Đang ghi âm {Math.floor(recorderState.durationMillis / 1000)}s
          </Text>
        )}
        <MentionSuggestions
          onSelect={(user) => {
            setContent((value) => insertMention(value, user));
            setDraftMentions((current) =>
              current.some((item) => item.userId === user.id)
                ? current
                : [...current, { userId: user.id, displayName: user.displayName }],
            );
          }}
          searchUsers={searchChatMentionUsers}
          showAvatar={!isGroupConversation}
          value={content}
        />
        <View style={styles.inputRow}>
          <Pressable
            accessibilityLabel={
              showChatTools ? "Ẩn đính kèm" : "Đính kèm"
            }
            accessibilityRole="button"
            accessibilityState={{ expanded: showChatTools }}
            onHoverIn={() => setHoveredComposerAction("attachment")}
            onHoverOut={() => setHoveredComposerAction(null)}
            onPress={() => {
              setShowStickers(false);
              setShowChatTools((current) => !current);
            }}
            style={({ pressed }) => [
              styles.composerActionButton,
              (hoveredComposerAction === "attachment" || pressed) &&
                styles.composerActionButtonHovered,
              showChatTools && styles.composerActionButtonActive,
              pressed && styles.composerActionButtonPressed,
            ]}
            {...(Platform.OS === "web" ? { title: "Đính kèm" } : {})}
          >
            <Ionicons
              color={showChatTools ? colors.primaryContrast : colors.primary}
              name={showChatTools ? "close" : "add"}
              size={24}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={showStickers ? "Ẩn nhãn dán" : "Nhãn dán"}
            accessibilityRole="button"
            accessibilityState={{ expanded: showStickers }}
            onHoverIn={() => setHoveredComposerAction("sticker")}
            onHoverOut={() => setHoveredComposerAction(null)}
            onPress={() => {
              setShowChatTools(false);
              setShowStickers((current) => !current);
            }}
            style={({ pressed }) => [
              styles.composerActionButton,
              (hoveredComposerAction === "sticker" || pressed) &&
                styles.composerActionButtonHovered,
              showStickers && styles.composerActionButtonActive,
              pressed && styles.composerActionButtonPressed,
            ]}
            {...(Platform.OS === "web" ? { title: "Nhãn dán" } : {})}
          >
            <MaterialCommunityIcons
              color={showStickers ? colors.primaryContrast : colors.primary}
              name="sticker-emoji"
              size={24}
            />
          </Pressable>
          {recorderState.isRecording && (
            <Pressable
              accessibilityLabel="Dừng ghi âm"
              onPress={toggleRecording}
              style={styles.stopRecordButton}
            >
              <Ionicons color={colors.dangerContrast} name="stop" size={18} />
            </Pressable>
          )}
          <View style={styles.messageInputShell}>
            <TextInput
              multiline
              onChangeText={handleMessageInputChange}
              onContentSizeChange={handleMessageInputContentSizeChange}
              placeholder="Nhập tin nhắn"
              placeholderTextColor={colors.textMuted}
              scrollEnabled={isMessageInputScrollableState}
              style={[styles.input, { height: messageInputHeight }]}
              textAlignVertical={
                messageInputHeight > MIN_MESSAGE_INPUT_HEIGHT ? "top" : "center"
              }
              value={content}
            />
          </View>
          <Pressable
            accessibilityLabel="Gửi tin nhắn"
            accessibilityRole="button"
            disabled={!content.trim() && attachments.length === 0}
            onHoverIn={() => setHoveredComposerAction("send")}
            onHoverOut={() => setHoveredComposerAction(null)}
            onPress={send}
            style={({ pressed }) => [
              styles.sendButton,
              hoveredComposerAction === "send" && styles.sendButtonHovered,
              !content.trim() && attachments.length === 0 &&
                styles.sendButtonDisabled,
              pressed && styles.composerActionButtonPressed,
            ]}
            {...(Platform.OS === "web" ? { title: "Gửi" } : {})}
          >
            <Ionicons color={colors.primaryContrast} name="send" size={18} />
          </Pressable>
        </View>
          </>
        )}
      </View>
      ) : null}
      <ChatMediaViewer
        attachment={viewingAttachment}
        onClose={() => setViewingAttachment(null)}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  attachmentSummary: { display: "none" },
  activeGroupCall: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  activeGroupCallIcon: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  activeGroupCallSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  activeGroupCallText: { flex: 1 },
  activeGroupCallTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  activeWaveBar: { backgroundColor: colors.primary },
  actionRow: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.sm,
  },
  attachmentPreviewList: { gap: spacing.sm, paddingRight: spacing.md },
  attachmentDownloadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_0_0_0_0_48,
    borderRadius: 7,
    gap: spacing.xs,
    justifyContent: "center",
    zIndex: 2,
  },
  attachmentDownloadText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  audioBody: { flex: 1, gap: 4 },
  audioLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  audioPill: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 46,
    minWidth: 210,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatarSpace: { width: 32 },
  bubble: {
    borderRadius: 10,
    gap: spacing.xs,
    maxWidth: "78%",
    overflow: "hidden",
    padding: spacing.md,
  },
  callHistoryMessage: {
    borderRadius: 10,
    gap: spacing.xs,
    maxWidth: "78%",
    padding: spacing.md,
  },
  callHistoryContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  callHistoryMessageText: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  mineCallHistoryMessage: {
    backgroundColor: colors.visuals.rgb_36_221_228_0_18,
    borderColor: colors.border,
    borderWidth: 1,
  },
  composer: {
    backgroundColor: colors.background,
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    position: "relative",
    zIndex: 2,
  },
  composerDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  fileIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  fileMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  fileName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  filePill: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 220,
    padding: spacing.sm,
    position: "relative",
  },
  fileText: { flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_36_221_228_0_16,
    borderBottomColor: colors.visuals.rgb_36_221_228_0_62,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    paddingTop: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: "900" },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  disabledIconButton: { opacity: 0.55 },
  downloadableAttachment: { position: "relative" },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: MAX_MESSAGE_INPUT_HEIGHT,
    minHeight: MIN_MESSAGE_INPUT_HEIGHT,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  inputRow: {
    alignItems: "flex-end",
    backgroundColor: colors.input,
    borderColor: colors.borderSubtle,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: 2,
  },
  messageInputShell: {
    alignItems: "flex-end",
    flex: 1,
    flexDirection: "row",
    maxHeight: MAX_MESSAGE_INPUT_HEIGHT,
    minHeight: MIN_MESSAGE_INPUT_HEIGHT,
    overflow: "hidden",
  },
  hidden: { display: "none" },
  hiddenList: { opacity: 0 },
  highlightedRow: { backgroundColor: colors.visuals.rgb_40_104_215_0_12 },
  loading: { flex: 1, justifyContent: "center" },
  messageImage: {
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
  },
  messageActionButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  messageActionMenu: {
    alignSelf: "center",
    flexDirection: "column",
    gap: spacing.xs,
  },
  messageRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    position: "relative",
  },
  messageText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  messageTime: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  messageMeta: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 4,
    justifyContent: "flex-end",
  },
  messagesContent: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingVertical: spacing.md,
  },
  mediaBubble: {
    backgroundColor: "transparent",
    padding: 0,
  },
  mediaLoadError: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    gap: spacing.xs,
    height: 140,
    justifyContent: "center",
    width: 220,
  },
  mediaLoadErrorText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  mediaTime: {
    backgroundColor: colors.visuals.rgb_102_112_133_0_32,
    borderRadius: 999,
    color: colors.white,
    marginTop: 4,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  mediaSendStatus: {
    backgroundColor: colors.visuals.rgb_102_112_133_0_32,
    borderRadius: 999,
    color: colors.white,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  mineBubble: {
    backgroundColor: colors.messageMine,
    borderColor: colors.visuals.rgb_36_221_228_0_66,
    borderWidth: 1,
  },
  mineActiveWaveBar: { backgroundColor: colors.primary },
  mineAudioLabel: { color: colors.messageMineText },
  mineAudioPill: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  mineFileIcon: { backgroundColor: colors.surfaceElevated },
  mineFileMeta: { color: colors.messageMineMuted },
  mineFileName: { color: colors.messageMineText },
  mineFilePill: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  mineLocationCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  mineMessageActionMenu: { marginRight: spacing.xs },
  mineRow: { justifyContent: "flex-end" },
  mineReplyBox: {
    backgroundColor: colors.visuals.rgb_0_104_255_0_08,
    borderLeftColor: colors.primary,
    borderRadius: 6,
    paddingBottom: spacing.xs,
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
  },
  mineReplyName: { color: colors.messageMineText },
  mineReplyText: { color: colors.messageMineMuted },
  mineRecalledMessageText: { color: colors.messageMineMuted },
  mineText: { color: colors.messageMineText },
  mineTime: { color: colors.messageMineMuted },
  newMessageButton: {
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
  },
  newMessageText: {
    color: colors.primaryContrast,
    fontSize: 13,
    fontWeight: "800",
  },
  composerActionButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: "center",
    minWidth: 44,
    overflow: "hidden",
    width: 44,
  },
  composerActionButtonHovered: { backgroundColor: colors.primarySoft },
  composerActionButtonActive: {
    backgroundColor: colors.primary,
  },
  composerActionButtonPressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  locationCard: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 190,
    padding: spacing.sm,
  },
  locationSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  locationTextWrap: { flex: 1 },
  locationTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  reaction: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    color: colors.text,
    fontSize: 12,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  recalledMessageText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "700",
  },
  recallActionButton: { borderColor: colors.visuals.rgb_240_68_56_0_35 },
  recordingButton: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  recordingText: { color: colors.danger, fontSize: 12, fontWeight: "800" },
  recordingToolLabel: { color: colors.danger },
  replyBox: {
    borderLeftColor: colors.primary,
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
  },
  replyComposer: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    flexDirection: "row",
    padding: spacing.sm,
  },
  replyComposerText: { flex: 1 },
  replyName: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  replyText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  screen: { backgroundColor: colors.background, flex: 1 },
  sendStatus: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
  },
  emptyMessages: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  emptyMessagesText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  failedSendStatus: { color: colors.danger },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    width: 44,
  },
  sendButtonHovered: { backgroundColor: colors.primaryPressed },
  sendButtonDisabled: { opacity: 0.45 },
  permissionComposer: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_239_71_111_0_1,
    borderColor: colors.visuals.rgb_239_71_111_0_35,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  permissionComposerText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  senderName: { color: colors.text, fontSize: 12, fontWeight: "900" },
  smallAvatar: { borderRadius: 16, height: 32, width: 32 },
  systemMessageBubble: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: "82%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  systemMessageRow: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  systemMessageText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    textAlign: "center",
  },
  theirBubble: {
    backgroundColor: colors.messageOther,
    borderColor: colors.visuals.rgb_152_80_232_0_62,
    borderWidth: 1,
  },
  theirCallHistoryMessage: {
    backgroundColor: colors.visuals.rgb_152_80_232_0_14,
    borderColor: colors.visuals.rgb_152_80_232_0_62,
    borderWidth: 1,
  },
  theirMessageActionMenu: { marginLeft: spacing.xs },
  theirRow: { justifyContent: "flex-start" },
  stickerButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  stickerText: { fontSize: 20 },
  stickerTray: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stopRecordButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  toolButton: {
    alignItems: "center",
    gap: 6,
    minHeight: 68,
    justifyContent: "center",
    overflow: "hidden",
    width: "33.333%",
  },
  toolLabel: { color: colors.text, fontSize: 11, fontWeight: "800" },
  toolIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  videoPlayOverlay: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_0_0_0_0_35,
    borderRadius: 999,
    height: 54,
    justifyContent: "center",
    position: "absolute",
    width: 54,
  },
  videoThumb: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  videoThumbImage: {
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  waveBar: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    width: 3,
  },
  waveform: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    height: 22,
  },
  mineWaveBar: { backgroundColor: colors.visuals.hex_8BC7FF },
});


