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
  Keyboard,
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

import {
  setActiveChatConversation,
  subscribeRealtimeConversationBlockedChanges,
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
import { getUser } from "@/stores/session-store";
import { colors, spacing } from "@/theme";
import type {
  ChatAttachment,
  ChatMessage,
  ChatParticipant,
  Conversation,
  SendMessageAttachment,
} from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";

const PAGE_SIZE = 30;
const STICKERS = ["👍", "❤️", "😂", "🔥", "👏", "😍", "😮", "🙏"];
const GOOGLE_MAPS_URL_PATTERN =
  /https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=-?\d+(\.\d+)?,-?\d+(\.\d+)?/;

const mergeOlder = (current: ChatMessage[], older: ChatMessage[]) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...older.filter((item) => !seen.has(item.id))];
};

const pendingAttachmentToViewerAttachment = (
  attachment: SendMessageAttachment,
): ChatAttachment => ({
  id: attachment.id,
  name: attachment.name,
  thumbnailUrl: null,
  type: attachment.kind,
  url: attachment.uri,
});

const markMessageRecalled = (
  message: ChatMessage,
  deletedBy?: string,
): ChatMessage => ({
  ...message,
  attachments: [],
  content: "",
  isDeleted: true,
  messageType: 7,
  reactions: [],
  sendStatus: "sent",
  deletedBy,
});

const toNewestFirstMessages = (items: ChatMessage[]) => [...items].reverse();

function AudioAttachment({
  attachment,
  isMine,
}: {
  attachment: ChatAttachment;
  isMine: boolean;
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
        color={isMine ? colors.white : colors.primary}
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
  onOpen,
}: {
  attachment: ChatAttachment;
  onLayoutReady: () => void;
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
    <Pressable onPress={() => onOpen(attachment)}>
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
  onOpen,
}: {
  allowLocalPreview: boolean;
  attachment: ChatAttachment;
  isMine: boolean;
  onLayoutReady: () => void;
  onOpen: (attachment: ChatAttachment) => void;
}) {
  if (attachment.type === "image") {
    return (
      <ImageAttachment
        attachment={attachment}
        onLayoutReady={onLayoutReady}
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
        onOpen={onOpen}
      />
    );
  }

  if (attachment.type === "audio") {
    return <AudioAttachment attachment={attachment} isMine={isMine} />;
  }

  return (
    <Pressable
      accessibilityRole="link"
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
      style={styles.filePill}
    >
      <View style={styles.fileIcon}>
        <Ionicons color={colors.primary} name="document-text" size={22} />
      </View>
      <View style={styles.fileText}>
        <Text numberOfLines={1} style={styles.fileName}>
          {attachment.name}
        </Text>
        <Text style={styles.fileMeta}>Tệp</Text>
      </View>
      <Ionicons color={colors.textMuted} name="open-outline" size={18} />
    </Pressable>
  );
}

function VideoAttachment({
  allowLocalPreview,
  attachment,
  onLayoutReady,
  onOpen,
}: {
  allowLocalPreview: boolean;
  attachment: ChatAttachment;
  onLayoutReady: () => void;
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
    <Pressable onPress={() => onOpen(attachment)} style={styles.videoThumb}>
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

function PendingAttachmentPreview({
  attachment,
  onOpen,
  onRemove,
}: {
  attachment: SendMessageAttachment;
  onOpen: (attachment: SendMessageAttachment) => void;
  onRemove: (id: string) => void;
}) {
  const videoPlayer = useVideoPlayer(
    attachment.kind === "video" ? attachment.uri : null,
  );
  const label =
    attachment.kind === "image"
      ? "Ảnh"
      : attachment.kind === "video"
        ? "Video"
        : attachment.kind === "audio"
          ? "Âm thanh"
          : "Tài liệu";

  return (
    <View style={styles.attachmentPreview}>
      {attachment.kind === "image" ? (
        <Pressable onPress={() => onOpen(attachment)}>
          <Image
            resizeMode="cover"
            source={{ uri: attachment.uri }}
            style={styles.attachmentThumb}
          />
        </Pressable>
      ) : attachment.kind === "video" ? (
        <Pressable
          onPress={() => onOpen(attachment)}
          style={styles.attachmentThumb}
        >
          <VideoView
            contentFit="cover"
            nativeControls={false}
            player={videoPlayer}
            style={styles.attachmentThumbVideo}
          />
          <View style={styles.attachmentThumbOverlay}>
            <Ionicons color={colors.white} name="play" size={16} />
          </View>
        </Pressable>
      ) : (
        <View style={styles.attachmentIcon}>
          <Ionicons
            color={colors.primary}
            name={attachment.kind === "audio" ? "mic" : "document-attach"}
            size={22}
          />
        </View>
      )}
      <Text numberOfLines={1} style={styles.attachmentPreviewName}>
        {label}
      </Text>
      <Pressable
        accessibilityLabel="Loại bỏ tệp đã chọn"
        onPress={() => onRemove(attachment.id)}
        style={styles.removeAttachmentButton}
      >
        <Ionicons color={colors.white} name="close" size={12} />
      </Pressable>
    </View>
  );
}

function LocationCard({ url, isMine }: { url: string; isMine: boolean }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => Linking.openURL(url)}
      style={[styles.locationCard, isMine && styles.mineLocationCard]}
    >
      <Ionicons
        color={isMine ? colors.white : colors.primary}
        name="location"
        size={18}
      />
      <View style={styles.locationTextWrap}>
        <Text style={[styles.locationTitle, isMine && styles.mineText]}>
          Vị trí hiện tại
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.locationSubtitle, isMine && styles.mineTime]}
        >
          Mở bằng Google Maps
        </Text>
      </View>
    </Pressable>
  );
}

function MessageRow({
  isActionsOpen,
  isHighlighted,
  message,
  showAvatar,
  onMediaLayout,
  onCloseActions,
  onOpenActions,
  onRecall,
  onReply,
  onReplyPress,
  onOpenAttachment,
}: {
  isActionsOpen: boolean;
  isHighlighted: boolean;
  message: ChatMessage;
  showAvatar: boolean;
  onMediaLayout: () => void;
  onCloseActions: () => void;
  onOpenActions: (message: ChatMessage) => void;
  onRecall: (message: ChatMessage) => void;
  onReply: (message: ChatMessage) => void;
  onReplyPress: (messageId: string) => void;
  onOpenAttachment: (attachment: ChatAttachment) => void;
}) {
  const locationUrl = message.content.match(GOOGLE_MAPS_URL_PATTERN)?.[0] ?? "";
  const textContent = locationUrl
    ? message.content.replace(locationUrl, "").trim()
    : message.content;
  const recallText = message.isMine
    ? "Bạn đã thu hồi một tin nhắn."
    : `${message.sender.displayName} đã thu hồi một tin nhắn.`;
  const hasMediaAttachment = message.attachments.some(
    (attachment) => attachment.type === "image" || attachment.type === "video",
  );
  const isMediaOnly =
    hasMediaAttachment &&
    !textContent &&
    !locationUrl &&
    message.reply === null &&
    message.reactions.length === 0;
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
    </View>
  );

  return (
    <Pressable
      onPress={onCloseActions}
      onLongPress={() => {
        if (!message.isDeleted) onOpenActions(message);
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
      <View
        style={[
          styles.bubble,
          isMediaOnly
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
          <LocationCard isMine={message.isMine} url={locationUrl} />
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
            message.isMine && !isMediaOnly && styles.mineTime,
            isMediaOnly && styles.mediaTime,
          ]}
        >
          {formatChatTime(message.createdAt)}
        </Text>
        {message.isMine && message.sendStatus && message.sendStatus !== "sent" ? (
          <Text
            style={[
              styles.sendStatus,
              isMediaOnly && styles.mediaSendStatus,
              message.sendStatus === "failed" && styles.failedSendStatus,
            ]}
          >
            {message.sendStatus === "sending" ? "Đang gửi..." : "Gửi lỗi"}
          </Text>
        ) : null}
      </View>
      {!message.isMine && isActionsOpen ? actions : null}
    </Pressable>
  );
}

function MediaViewer({
  attachment,
  onClose,
}: {
  attachment: ChatAttachment | null;
  onClose: () => void;
}) {
  const videoPlayer = useVideoPlayer(
    attachment?.type === "video" ? attachment.url : null,
    (player) => {
      player.loop = false;
      player.play();
    },
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent={false}
      visible={attachment !== null}
    >
      <View style={styles.viewer}>
        <Pressable
          accessibilityLabel="Đóng trình xem"
          onPress={onClose}
          style={styles.viewerClose}
        >
          <Ionicons color={colors.white} name="close" size={26} />
        </Pressable>
        {attachment?.type === "image" ? (
          <Image
            resizeMode="contain"
            source={{ uri: attachment.url }}
            style={styles.viewerImage}
          />
        ) : attachment?.type === "video" ? (
          <VideoView
            contentFit="contain"
            fullscreenOptions={{ enable: true }}
            nativeControls
            player={videoPlayer}
            style={styles.viewerVideo}
          />
        ) : null}
      </View>
    </Modal>
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
    scrollToMessageId?: string;
  }>();
  const conversationId = params.conversationId ?? "";
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const pendingScrollToEndRef = useRef(false);
  const pendingScrollAnimatedRef = useRef(false);
  const isAtBottomRef = useRef(true);
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(params.isBlocked === "true");
  const [blockedBy, setBlockedBy] = useState<ChatParticipant | null>(null);
  const [conversationDetails, setConversationDetails] =
    useState<Conversation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [viewingAttachment, setViewingAttachment] =
    useState<ChatAttachment | null>(null);

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
      if (mode === "initial") {
        setIsLoading(true);
      }
      if (mode === "more") setIsLoadingMore(true);
      try {
        const result = await getConversationMessages(conversationId, {
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        const nextItems = toNewestFirstMessages(
          result.items.map(normalizeMessage),
        );
        if (result.conversation) {
          setIsBlocked(result.conversation.isBlocked === true);
          setBlockedBy(result.conversation.blockedBy ?? null);
        }
        setMessages((current) =>
          nextPage === 1 ? nextItems : mergeOlder(current, nextItems),
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        if (nextPage === 1) void markConversationRead(conversationId);
      } catch (error) {
        Alert.alert(
          "Không thể tải tin nhắn",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [conversationId, normalizeMessage, scrollToEndAfterLayout],
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
          pageSize: PAGE_SIZE,
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
      isLoadingMore,
      messages,
      normalizeMessage,
      page,
      scrollToMessage,
      totalPages,
    ],
  );

  useEffect(() => {
    setActiveChatConversation(conversationId || null);
    return () => setActiveChatConversation(null);
  }, [conversationId]);

  useEffect(() => {
    getUser().then((user) => setCurrentUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    load(1, "initial");
  }, [load]);

  useEffect(() => {
    if (!conversationId) return;
    let isMounted = true;
    void getConversation(conversationId)
      .then((conversation) => {
        if (!isMounted) return;
        setConversationDetails(conversation);
        setIsBlocked(conversation.isBlocked === true);
        setBlockedBy(conversation.blockedBy ?? null);
      })
      .catch(() => {
        if (isMounted) setConversationDetails(null);
      });
    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
        if (!nextMessage.isMine) void markConversationRead(conversationId);
        if (isAtBottomRef.current || nextMessage.isMine) {
          scrollToEndAfterLayout(true);
        } else {
          setHasNewMessage(true);
        }
      }),
    [conversationId, normalizeMessage, scrollToEndAfterLayout],
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
    if (conversationDetails) {
      return conversationDetails.conversationType === "Private"
        ? (conversationDetails.otherParticipant?.displayName ??
            conversationDetails.name)
        : conversationDetails.name;
    }
    if (params.conversationName) return params.conversationName;
    const other = messages.find((item) => !item.isMine)?.sender.displayName;
    return other ?? "Chat";
  }, [conversationDetails, messages, params.conversationName]);

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
    title,
  ]);

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
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images", "videos"],
      quality: 0.85,
    });
    if (result.canceled) return;
    addImagePickerAssets(result.assets);
  }, [addImagePickerAssets]);

  const takePhoto = useCallback(async () => {
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
  }, [addImagePickerAssets]);

  const pickFiles = useCallback(async () => {
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
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }, []);

  const toggleRecording = useCallback(async () => {
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
  }, [recorder, recorderState.isRecording]);

  const shareLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Không thể chia sẻ vị trí", "Ứng dụng chưa có quyền vị trí.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      setContent((current) => [current.trim(), url].filter(Boolean).join(" "));
    } catch (error) {
      Alert.alert(
        "Không thể lấy vị trí",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  }, []);

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
        setMessages((current) =>
          current.map((item) => (item.id === message.id ? message : item)),
        );
        Alert.alert(
          "Không thể thu hồi tin nhắn",
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        );
      }
    },
    [],
  );

  const openMessageActions = useCallback((message: ChatMessage) => {
    if (message.isDeleted) return;
    setActionMessageId((current) =>
      current === message.id ? null : message.id,
    );
  }, []);

  const send = useCallback(async () => {
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
      setMessages((current) =>
        current.map((item) =>
          item.id === optimisticId ? { ...item, sendStatus: "failed" } : item,
        ),
      );
    }
  }, [attachments, content, conversationId, normalizeMessage, replyTo, scrollToEndAfterLayout]);

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
          <View style={styles.blockedComposer}>
            <Ionicons color={colors.danger} name="ban-outline" size={18} />
            <Text style={styles.blockedComposerText}>
              {blockedComposerMessage}
            </Text>
          </View>
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
            {STICKERS.map((sticker) => (
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
        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Chụp ảnh nhanh"
            onPress={takePhoto}
            style={styles.toolButton}
          >
            <Ionicons color={colors.primary} name="camera" size={20} />
          </Pressable>
          <Pressable
            accessibilityLabel="Chọn ảnh hoặc video"
            onPress={pickMedia}
            style={styles.toolButton}
          >
            <Ionicons color={colors.primary} name="image" size={20} />
          </Pressable>
          <Pressable
            accessibilityLabel="Chọn file"
            onPress={pickFiles}
            style={styles.toolButton}
          >
            <Ionicons color={colors.primary} name="document-attach" size={20} />
          </Pressable>
          <Pressable
            accessibilityLabel={recorderState.isRecording ? "Dừng ghi âm" : "Ghi âm"}
            onPress={toggleRecording}
            style={[
              styles.toolButton,
              recorderState.isRecording && styles.recordingButton,
            ]}
          >
            <Ionicons
              color={recorderState.isRecording ? colors.white : colors.primary}
              name={recorderState.isRecording ? "stop" : "mic"}
              size={20}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Chọn sticker"
            onPress={() => setShowStickers((current) => !current)}
            style={styles.toolButton}
          >
            <Ionicons color={colors.primary} name="happy" size={20} />
          </Pressable>
          <Pressable
            accessibilityLabel="Chia sẻ vị trí hiện tại"
            onPress={shareLocation}
            style={styles.toolButton}
          >
            <Ionicons color={colors.primary} name="location" size={20} />
          </Pressable>
        </View>
        {recorderState.isRecording && (
          <Text style={styles.recordingText}>
            Đang ghi âm {Math.floor(recorderState.durationMillis / 1000)}s
          </Text>
        )}
        <View style={styles.inputRow}>
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
      <MediaViewer
        attachment={viewingAttachment}
        onClose={() => setViewingAttachment(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  attachmentSummary: { display: "none" },
  activeWaveBar: { backgroundColor: colors.danger },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-around",
  },
  attachmentIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 7,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  attachmentPreview: {
    alignItems: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "column",
    gap: spacing.xs,
    marginRight: spacing.sm,
    minHeight: 92,
    padding: spacing.xs,
    position: "relative",
    width: 76,
  },
  attachmentPreviewList: { gap: spacing.sm, paddingRight: spacing.md },
  attachmentPreviewName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
  },
  attachmentThumb: {
    backgroundColor: colors.border,
    borderRadius: 7,
    height: 64,
    overflow: "hidden",
    width: 64,
  },
  attachmentThumbOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    left: 19,
    position: "absolute",
    top: 19,
    width: 26,
  },
  attachmentThumbVideo: { height: "100%", width: "100%" },
  audioBody: { flex: 1, gap: 4 },
  audioLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  audioPill: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    minWidth: 210,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
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
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  fileMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  fileName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  filePill: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
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
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
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
    flexDirection: "row",
    gap: spacing.xs,
  },
  messageRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  messageText: { color: colors.text, fontSize: 16, lineHeight: 22 },
  messageTime: {
    alignSelf: "flex-end",
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  messagesContent: { paddingVertical: spacing.md },
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
  mineBubble: { backgroundColor: colors.primary },
  mineActiveWaveBar: { backgroundColor: colors.primarySoft },
  mineAudioLabel: { color: colors.primarySoft },
  mineAudioPill: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderColor: "rgba(255, 255, 255, 0.24)",
  },
  mineLocationCard: { borderColor: colors.primarySoft },
  mineMessageActionMenu: { marginRight: spacing.xs },
  mineRow: { justifyContent: "flex-end" },
  mineReplyBox: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderLeftColor: colors.white,
    borderRadius: 6,
    paddingBottom: spacing.xs,
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
  },
  mineReplyName: { color: colors.white },
  mineReplyText: { color: colors.primarySoft },
  mineRecalledMessageText: { color: colors.primarySoft },
  mineText: { color: colors.white },
  mineTime: { color: colors.primarySoft },
  newMessageButton: {
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
  },
  newMessageText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  locationCard: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
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
  },
  recordingText: { color: colors.danger, fontSize: 12, fontWeight: "800" },
  removeAttachmentButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -6,
    top: -6,
    width: 20,
  },
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
    alignSelf: "flex-end",
    color: colors.primarySoft,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
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
  blockedComposer: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  blockedComposerText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  senderName: { color: colors.text, fontSize: 12, fontWeight: "900" },
  smallAvatar: { borderRadius: 16, height: 32, width: 32 },
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
  toolButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
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
  viewer: {
    alignItems: "center",
    backgroundColor: colors.reelBackground,
    flex: 1,
    justifyContent: "center",
  },
  viewerClose: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    top: spacing.xl,
    width: 44,
    zIndex: 2,
  },
  viewerImage: { height: "100%", width: "100%" },
  viewerVideo: { height: "100%", width: "100%" },
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
  mineWaveBar: { backgroundColor: colors.white },
});


