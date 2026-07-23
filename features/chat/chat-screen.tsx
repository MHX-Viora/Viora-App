import Ionicons from "@expo/vector-icons/Ionicons";
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
import { router, useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddMembersModal } from "@/components/chat/add-members-modal";
import { ChatComposerNotice } from "@/components/chat/chat-composer-notice";
import { ChatMediaViewer } from "@/components/chat/chat-media-viewer";
import { PendingAttachmentPreview } from "@/components/chat/pending-attachment-preview";
import { showAppToast } from "@/components/common/app-toast";
import {
  CHAT_PAGE_SIZE,
  CHAT_STICKERS,
  GOOGLE_MAPS_URL_PATTERN,
} from "@/constants/chat";
import {
  setActiveChatConversation,
  subscribeRealtimeConversationBlockedChanges,
  subscribeRealtimeConversationDissolved,
  subscribeRealtimeMessageDeleted,
  subscribeRealtimeMessageDelivered,
  subscribeRealtimeMessages,
  subscribeRealtimeSyncRequests,
} from "@/features/chat/chat-events";
import {
  getConversation,
  getConversationMessages,
  markConversationRead,
  recallChatMessage,
  sendChatMessage,
} from "@/services/chat.service";
import { syncChatUnreadCount } from "@/services/chat-sync.service";
import { joinRealtimeGroup, leaveRealtimeGroup } from "@/services/realtime.service";
import { getUser } from "@/stores/session-store";
import { colors, spacing } from "@/theme";
import { MessageType } from "@/types/chat";
import type {
  ChatAttachment,
  ChatMessage,
  ChatParticipant,
  Conversation,
  SendMessageAttachment,
} from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";
import {
  getRealtimeConversationGroupName,
  isConversationGoneError,
  markMessageRecalled,
  mergeOlder,
  pendingAttachmentToViewerAttachment,
  toNewestFirstMessages,
} from "@/utils/chat-message";
import { useKeyboardVisible } from "@/hooks/chat/use-keyboard-visible";
import { useChatPermissions } from "@/hooks/chat/use-chat-permissions";

function AudioAttachment({
  attachment,
  isMine,
  onLongPress,
}: {
  attachment: ChatAttachment;
  isMine: boolean;
  onLongPress: () => void;
}) {
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
      onPress={() => {
        if (status.playing) {
          player.pause();
          return;
        }
        player.play();
      }}
      style={[styles.audioPill, isMine && styles.mineAudioPill]}
    >
      <Ionicons
        color="#0068FF"
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
    </Pressable>
  );
}

function ImageAttachment({
  attachment,
  onLayoutReady,
  onLongPress,
  onOpen,
}: {
  attachment: ChatAttachment;
  onLayoutReady: () => void;
  onLongPress: () => void;
  onOpen: (attachment: ChatAttachment) => void;
}) {
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
    <Pressable onLongPress={onLongPress} onPress={() => onOpen(attachment)}>
      <Image
        onError={() => {
          setHasError(true);
          onLayoutReady();
        }}
        resizeMode="contain"
        source={{ uri: attachment.url }}
        style={[styles.messageImage, size]}
      />
    </Pressable>
  );
}

function AttachmentView({
  allowLocalPreview,
  attachment,
  isMine,
  onLayoutReady,
  onLongPress,
  onOpen,
}: {
  allowLocalPreview: boolean;
  attachment: ChatAttachment;
  isMine: boolean;
  onLayoutReady: () => void;
  onLongPress: () => void;
  onOpen: (attachment: ChatAttachment) => void;
}) {
  if (attachment.type === "image") {
    return (
      <ImageAttachment
        attachment={attachment}
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
        <Ionicons color="#0068FF" name="document-text-outline" size={22} />
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
        color="#0068FF"
        name="open-outline"
        size={18}
      />
    </Pressable>
  );
}

function VideoAttachment({
  allowLocalPreview,
  attachment,
  onLayoutReady,
  onLongPress,
  onOpen,
}: {
  allowLocalPreview: boolean;
  attachment: ChatAttachment;
  onLayoutReady: () => void;
  onLongPress: () => void;
  onOpen: (attachment: ChatAttachment) => void;
}) {
  const isLocalCacheUrl = attachment.url.startsWith("file://");
  const player = useVideoPlayer(attachment.url, (nextPlayer) => {
    nextPlayer.muted = true;
    nextPlayer.loop = true;
    nextPlayer.play();
  });

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
      style={styles.videoThumb}
    >
      <VideoView
        contentFit="contain"
        nativeControls={false}
        onFirstFrameRender={onLayoutReady}
        player={player}
        style={styles.videoThumbImage}
      />
      <View style={styles.videoPlayOverlay}>
        <Ionicons color={colors.white} name="play" size={28} />
      </View>
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
  return (
    <Pressable
      accessibilityRole="link"
      onLongPress={onLongPress}
      onPress={() => Linking.openURL(url)}
      style={[styles.locationCard, isMine && styles.mineLocationCard]}
    >
      <Ionicons
        color="#0068FF"
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

function SystemMessage({ content }: { content: string }) {
  return (
    <View style={styles.systemMessageRow}>
      <View style={styles.systemMessageBubble}>
        <Text style={styles.systemMessageText}>{content}</Text>
      </View>
    </View>
  );
}

function MessageRow({
  isActionsOpen,
  isHighlighted,
  message,
  showAvatar,
  canReply,
  onMediaLayout,
  onCloseActions,
  onOpenActions,
  onRecall,
  onForward,
  onReply,
  onReplyPress,
  onOpenAttachment,
}: {
  isActionsOpen: boolean;
  isHighlighted: boolean;
  message: ChatMessage;
  showAvatar: boolean;
  canReply: boolean;
  onMediaLayout: () => void;
  onCloseActions: () => void;
  onOpenActions: (message: ChatMessage) => void;
  onRecall: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onReply: (message: ChatMessage) => void;
  onReplyPress: (messageId: string) => void;
  onOpenAttachment: (attachment: ChatAttachment) => void;
}) {
  if (message.messageType === MessageType.System) {
    return <SystemMessage content={message.content} />;
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
  const sendStatusLabel =
    message.isMine && message.sendStatus && message.sendStatus !== "sent"
      ? message.sendStatus === "sending"
        ? "Đang gửi..."
        : "Gửi lỗi"
      : "";
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
      {!message.isMine &&
        (showAvatar && message.sender.avatarUrl ? (
          <Image
            source={{ uri: message.sender.avatarUrl }}
            style={styles.smallAvatar}
          />
        ) : (
          <View style={styles.avatarSpace} />
        ))}
      {message.isMine && isActionsOpen ? actions : null}
      {sendStatusLabel ? (
        <Text
          style={[
            styles.sendStatus,
            !hasBubbleBackground && styles.mediaSendStatus,
            message.sendStatus === "failed" && styles.failedSendStatus,
          ]}
        >
          {sendStatusLabel}
        </Text>
      ) : null}
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
          <Text style={[styles.messageText, message.isMine && styles.mineText]}>
            {textContent}
          </Text>
        ) : null}
        {!message.isDeleted && message.attachments.map((attachment) => (
          <AttachmentView
            allowLocalPreview={
              message.sendStatus === "sending" || message.sendStatus === "failed"
            }
            attachment={attachment}
            isMine={message.isMine}
            key={attachment.id}
            onLayoutReady={onMediaLayout}
            onLongPress={() => onOpenActions(message)}
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
        <Text
          style={[
            styles.messageTime,
            message.isMine && hasBubbleBackground && styles.mineTime,
            !hasBubbleBackground && styles.mediaTime,
          ]}
        >
          {formatChatTime(message.createdAt)}
        </Text>
      </View>
      {!message.isMine && isActionsOpen ? actions : null}
    </Pressable>
  );
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
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
  const isAtBottomRef = useRef(true);
  const dissolvedRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<SendMessageAttachment[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [actionMessageId, setActionMessageId] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [showChatTools, setShowChatTools] = useState(false);
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
  const [messagePermissions, setMessagePermissions] = useState<{
    canSendMessage: boolean;
    onlyAdminCanSend: boolean;
  } | null>(null);

  const normalizeMessage = useCallback(
    (message: ChatMessage): ChatMessage => message,
    [],
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
    async (nextPage: number, mode: "initial" | "more") => {
      if (!conversationId) return;
      if (dissolvedRef.current) return;
      if (mode === "initial") {
        setIsLoading(true);
      }
      if (mode === "more") setIsLoadingMore(true);
      try {
        const result = await getConversationMessages(conversationId, {
          page: nextPage,
          pageSize: CHAT_PAGE_SIZE,
        });
        const nextItems = toNewestFirstMessages(
          result.items.map(normalizeMessage),
        );
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
        setMessages((current) =>
          nextPage === 1 ? nextItems : mergeOlder(current, nextItems),
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        if (nextPage === 1) markConversationReadSafe();
      } catch (error) {
        if (handleRoomApiError(error)) return;
        Alert.alert(
          "Không thể tải tin nhắn",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [conversationId, handleRoomApiError, markConversationReadSafe, normalizeMessage],
  );

  const scrollToReplyMessage = useCallback(
    async (messageId: string) => {
      if (scrollToMessage(messageId)) return;
      if (!conversationId || page >= totalPages || isLoadingMore) {
        Alert.alert("Không tìm thấy tin nhắn", "Tin nhắn gốc chưa có trong phòng chat.");
        return;
      }

      const nextPage = page + 1;
      setIsLoadingMore(true);
      try {
        const result = await getConversationMessages(conversationId, {
          page: nextPage,
          pageSize: CHAT_PAGE_SIZE,
        });
        const olderMessages = toNewestFirstMessages(
          result.items.map(normalizeMessage),
        );
        const nextMessages = mergeOlder(messages, olderMessages);
        setMessages(nextMessages);
        setPage(result.page);
        setTotalPages(result.totalPages);

        const nextIndex = nextMessages.findIndex((item) => item.id === messageId);
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
        if (handleRoomApiError(error)) return;
        Alert.alert(
          "Không thể tải tin nhắn gốc",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        setIsLoadingMore(false);
      }
    },
    [
      conversationId,
      handleRoomApiError,
      isLoadingMore,
      messages,
      normalizeMessage,
      page,
      scrollToMessage,
      totalPages,
    ],
  );

  useEffect(() => {
    dissolvedRef.current = false;
    setActiveChatConversation(conversationId || null);
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
      setActiveChatConversation(null);
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
    load(1, "initial");
  }, [load]);

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
        const nextMessage = normalizeMessage(message);
        setMessages((current) =>
          current.some((item) => item.id === nextMessage.id)
            ? current
            : [nextMessage, ...current],
        );
        if (!nextMessage.isMine) markConversationReadSafe();
        if (isAtBottomRef.current || nextMessage.isMine) {
          scrollToEndAfterLayout(true);
        } else {
          setHasNewMessage(true);
        }
      }),
    [conversationId, markConversationReadSafe, normalizeMessage, scrollToEndAfterLayout],
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
    [conversationId],
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
    [conversationId],
  );

  useEffect(
    () =>
      subscribeRealtimeSyncRequests(() => {
        void load(1, "initial");
      }),
    [load],
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

  const pickMedia = useCallback(async () => {
    if (!canSendInConversation) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images", "videos"],
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

  const toggleRecording = useCallback(async () => {
    if (!canSendInConversation && !recorderState.isRecording) return;
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          setAttachments((current) => [
            ...current,
            {
              id: `${uri}-${Date.now()}`,
              kind: "audio",
              name: `voice-${Date.now()}.m4a`,
              type: Platform.OS === "android" ? "audio/3gpp" : "audio/m4a",
              duration: Math.round(recorderState.durationMillis / 1000),
              uri,
            },
          ]);
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
  }, [canSendInConversation, recorder, recorderState.isRecording]);

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

      setMessages((current) => [optimisticMessage, ...current]);
      scrollToEndAfterLayout(true);

      const message = await sendChatMessage({
        attachments: [],
        content: url,
        conversationId,
      });
      const sentMessage = {
        ...normalizeMessage(message),
        isMine: true,
        sendStatus: "sent" as const,
      };
      setMessages((current) =>
        current.some((item) => item.id === sentMessage.id)
          ? current.filter((item) => item.id !== optimisticId)
          : current.map((item) =>
              item.id === optimisticId ? sentMessage : item,
            ),
      );
      scrollToEndAfterLayout(true);
    } catch (error) {
      if (pendingLocationId) {
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
  }, [canSendInConversation, conversationId, normalizeMessage, scrollToEndAfterLayout]);

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
    [handleRoomApiError],
  );

  const openMessageActions = useCallback((message: ChatMessage) => {
    if (message.messageType === MessageType.System) return;
    setActionMessageId((current) =>
      current === message.id ? null : message.id,
    );
  }, []);

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
    const draftAttachments = attachments;
    const draftReply = replyTo;
    const optimisticId = `pending-${Date.now()}`;
    const currentUser = await getUser();
    const optimisticMessage: ChatMessage = {
      attachments: draftAttachments.map(pendingAttachmentToViewerAttachment),
      content: draftContent,
      conversationId,
      createdAt: new Date().toISOString(),
      id: optimisticId,
      isDeleted: false,
      isEdited: false,
      isMine: true,
      messageType:
        draftAttachments.length === 0
          ? 0
          : draftAttachments[0].kind === "image"
            ? 1
            : draftAttachments[0].kind === "video"
              ? 2
              : draftAttachments[0].kind === "audio"
                ? 4
                : 3,
      reactions: [],
      reply: draftReply
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

    setMessages((current) => [optimisticMessage, ...current]);
    setContent("");
    setAttachments([]);
    setReplyTo(null);
    scrollToEndAfterLayout(true);
    try {
      const message = await sendChatMessage({
        attachments: draftAttachments,
        content: draftContent,
        conversationId,
        replyToMessageId: draftReply?.id,
      });
      const sentMessage = {
        ...normalizeMessage(message),
        isMine: true,
        sendStatus: "sent" as const,
      };
      setMessages((current) =>
        current.some((item) => item.id === sentMessage.id)
          ? current.filter((item) => item.id !== optimisticId)
          : current.map((item) =>
              item.id === optimisticId ? sentMessage : item,
            ),
      );
      scrollToEndAfterLayout(true);
    } catch (error) {
      if (handleRoomApiError(error)) {
        setMessages((current) =>
          current.filter((item) => item.id !== optimisticId),
        );
        return;
      }
      setMessages((current) =>
        current.map((item) =>
          item.id === optimisticId ? { ...item, sendStatus: "failed" } : item,
        ),
      );
    }
  }, [attachments, canSendInConversation, content, conversationId, handleRoomApiError, normalizeMessage, replyTo, scrollToEndAfterLayout]);

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
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
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
          keyExtractor={(item) => item.id}
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
                canReply={canSendInConversation}
                isActionsOpen={actionMessageId === item.id}
                isHighlighted={highlightedMessageId === item.id}
                message={item}
                onCloseActions={() => setActionMessageId(null)}
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
                showAvatar={showAvatar}
              />
            );
          }}
          scrollEventThrottle={16}
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
        ) : !canSendInConversation ? (
          showAdminOnlyMessage ? (
            <View style={styles.permissionComposer}>
              <Text style={styles.permissionComposerText}>
                Chỉ quản trị viên mới có thể gửi tin nhắn.
              </Text>
            </View>
          ) : null
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
          <View style={styles.stickerTray}>
            {CHAT_STICKERS.map((sticker) => (
              <Pressable
                accessibilityLabel={`Chọn sticker ${sticker}`}
                key={sticker}
                onPress={() => {
                  setContent((current) => `${current}${sticker}`);
                  setShowStickers(false);
                }}
                style={styles.stickerButton}
              >
                <Text style={styles.stickerText}>{sticker}</Text>
              </Pressable>
            ))}
          </View>
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
            <Ionicons color="#0068FF" name="camera-outline" size={21} />
            <Text style={styles.toolLabel}>Camera</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Chọn ảnh hoặc video"
            onPress={() => {
              setShowChatTools(false);
              pickMedia();
            }}
            style={styles.toolButton}
          >
            <Ionicons color="#0068FF" name="image-outline" size={21} />
            <Text style={styles.toolLabel}>Ảnh</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Chọn file"
            onPress={() => {
              setShowChatTools(false);
              pickFiles();
            }}
            style={styles.toolButton}
          >
            <Ionicons color="#0068FF" name="document-text-outline" size={21} />
            <Text style={styles.toolLabel}>Tệp</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={recorderState.isRecording ? "Dừng ghi âm" : "Ghi âm"}
            onPress={() => {
              setShowChatTools(false);
              toggleRecording();
            }}
            style={[
              styles.toolButton,
              recorderState.isRecording && styles.recordingButton,
            ]}
          >
            <Ionicons
              color={recorderState.isRecording ? colors.white : "#0068FF"}
              name={recorderState.isRecording ? "stop" : "mic-outline"}
              size={21}
            />
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
            accessibilityLabel="Chọn sticker"
            onPress={() => {
              setShowStickers((current) => !current);
              setShowChatTools(false);
            }}
            style={styles.toolButton}
          >
            <Ionicons color="#0068FF" name="happy-outline" size={21} />
            <Text style={styles.toolLabel}>Sticker</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Chia sẻ vị trí hiện tại"
            onPress={() => {
              setShowChatTools(false);
              shareLocation();
            }}
            style={styles.toolButton}
          >
            <Ionicons color="#0068FF" name="location-outline" size={21} />
            <Text style={styles.toolLabel}>Vị trí</Text>
          </Pressable>
        </View>
        )}
        {recorderState.isRecording && (
          <Text style={styles.recordingText}>
            Đang ghi âm {Math.floor(recorderState.durationMillis / 1000)}s
          </Text>
        )}
        <View style={styles.inputRow}>
          <Pressable
            accessibilityLabel={
              showChatTools ? "Ẩn chức năng chat" : "Mở chức năng chat"
            }
            onPress={() => {
              setShowChatTools((current) => {
                if (current) setShowStickers(false);
                return !current;
              });
            }}
            style={[
              styles.moreToolButton,
              showChatTools && styles.moreToolButtonActive,
            ]}
          >
            <Ionicons
              color={showChatTools ? colors.white : "#0068FF"}
              name={showChatTools ? "close" : "add-circle-outline"}
              size={24}
            />
            <Text
              style={styles.hidden}
            >
              Ghi âm
            </Text>
          </Pressable>
          {recorderState.isRecording && (
            <Pressable
              accessibilityLabel="Dừng ghi âm"
              onPress={toggleRecording}
              style={styles.stopRecordButton}
            >
              <Ionicons color={colors.white} name="stop" size={18} />
            </Pressable>
          )}
          <TextInput
            multiline
            onChangeText={setContent}
            placeholder="Nhập tin nhắn"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={content}
          />
          <Pressable
            accessibilityLabel="Gửi tin nhắn"
            disabled={!content.trim() && attachments.length === 0}
            onPress={send}
            style={[
              styles.sendButton,
              !content.trim() &&
                attachments.length === 0 &&
                styles.sendButtonDisabled,
            ]}
          >
            <Ionicons color={colors.white} name="send" size={18} />
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

const styles = StyleSheet.create({
  attachmentSummary: { display: "none" },
  activeWaveBar: { backgroundColor: "#0068FF" },
  actionRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  attachmentPreviewList: { gap: spacing.sm, paddingRight: spacing.md },
  audioBody: { flex: 1, gap: 4 },
  audioLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  audioPill: {
    alignItems: "center",
    backgroundColor: "#EAF5FF",
    borderColor: "#D8EAFF",
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
    borderRadius: 8,
    gap: spacing.xs,
    maxWidth: "78%",
    padding: spacing.md,
  },
  composer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  fileIcon: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  fileMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  fileName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  filePill: {
    alignItems: "center",
    backgroundColor: "#EAF5FF",
    borderColor: "#D8EAFF",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 220,
    padding: spacing.sm,
  },
  fileText: { flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    paddingTop: spacing.xl,
  },
  headerTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: "900" },
  iconButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  input: {
    backgroundColor: "#F4F8FC",
    borderColor: "#D8EAFF",
    borderRadius: 18,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 15,
    maxHeight: 112,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRow: { alignItems: "flex-end", flexDirection: "row", gap: spacing.sm },
  hidden: { display: "none" },
  hiddenList: { opacity: 0 },
  highlightedRow: { backgroundColor: "rgba(40, 104, 215, 0.12)" },
  loading: { flex: 1, justifyContent: "center" },
  messageImage: {
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
  },
  messageActionButton: {
    alignItems: "center",
    backgroundColor: colors.white,
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
    alignSelf: "flex-end",
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  messagesContent: {
    backgroundColor: "#F4F9FF",
    flexGrow: 1,
    paddingVertical: spacing.md,
  },
  mediaBubble: {
    backgroundColor: "transparent",
    padding: 0,
  },
  mediaLoadError: {
    alignItems: "center",
    backgroundColor: colors.white,
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
    alignSelf: "flex-start",
    backgroundColor: "rgba(102, 112, 133, 0.32)",
    borderRadius: 999,
    color: colors.white,
    marginTop: 4,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  mediaSendStatus: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(102, 112, 133, 0.32)",
    borderRadius: 999,
    color: colors.white,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  mineBubble: { backgroundColor: "#DCEEFF" },
  mineActiveWaveBar: { backgroundColor: "#0068FF" },
  mineAudioLabel: { color: colors.text },
  mineAudioPill: {
    backgroundColor: "#EAF5FF",
    borderColor: "#D8EAFF",
  },
  mineFileIcon: { backgroundColor: colors.white },
  mineFileMeta: { color: colors.textMuted },
  mineFileName: { color: colors.text },
  mineFilePill: {
    backgroundColor: "#EAF5FF",
    borderColor: "#D8EAFF",
  },
  mineLocationCard: {
    backgroundColor: "#EAF5FF",
    borderColor: "#D8EAFF",
  },
  mineMessageActionMenu: { marginRight: spacing.xs },
  mineRow: { justifyContent: "flex-end" },
  mineReplyBox: {
    backgroundColor: "rgba(0, 104, 255, 0.08)",
    borderLeftColor: "#0068FF",
    borderRadius: 6,
    paddingBottom: spacing.xs,
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
  },
  mineReplyName: { color: "#0068FF" },
  mineReplyText: { color: colors.textMuted },
  mineRecalledMessageText: { color: colors.textMuted },
  mineText: { color: colors.text },
  mineTime: { color: colors.textMuted },
  newMessageButton: {
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
  },
  newMessageText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  moreToolButton: {
    alignItems: "center",
    backgroundColor: "#EEF6FF",
    borderColor: "#D7E9FF",
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  moreToolButtonActive: {
    backgroundColor: "#2D8CFF",
    borderColor: "#2D8CFF",
  },
  locationCard: {
    alignItems: "center",
    backgroundColor: "#EAF5FF",
    borderColor: "#D8EAFF",
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
  recallActionButton: { borderColor: "rgba(240, 68, 56, 0.35)" },
  recordingButton: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  recordingText: { color: colors.danger, fontSize: 12, fontWeight: "800" },
  recordingToolLabel: { color: colors.white },
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
  screen: { backgroundColor: "#F4F9FF", flex: 1 },
  sendStatus: {
    backgroundColor: colors.background,
    borderRadius: 999,
    bottom: -8,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: spacing.xs,
    position: "absolute",
    right: spacing.md,
    zIndex: 2,
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
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  sendButtonDisabled: { opacity: 0.45 },
  permissionComposer: {
    alignItems: "center",
    backgroundColor: "rgba(239, 71, 111, 0.1)",
    borderColor: "rgba(239, 71, 111, 0.35)",
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
    backgroundColor: colors.background,
    borderRadius: 8,
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  theirMessageActionMenu: { marginLeft: spacing.xs },
  theirRow: { justifyContent: "flex-start" },
  stickerButton: {
    alignItems: "center",
    backgroundColor: colors.white,
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
    backgroundColor: "#EEF6FF",
    borderColor: "#D7E9FF",
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    height: 64,
    justifyContent: "center",
    width: "30.5%",
  },
  toolLabel: { color: colors.text, fontSize: 11, fontWeight: "800" },
  videoPlayOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
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
    height: 180,
    justifyContent: "center",
    overflow: "hidden",
    width: 240,
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
  mineWaveBar: { backgroundColor: "#8BC7FF" },
});


