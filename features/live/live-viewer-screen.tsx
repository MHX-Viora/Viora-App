import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { UserAvatar } from "@/components/common/user-avatar";
import { LiveCreatorAvatar } from "@/features/live/live-creator-avatar";
import { LiveGiftSheet } from "@/features/live/live-gift-sheet";
import { LiveOverlayComment } from "@/features/live/live-overlay-comment";
import { LiveGiftOverlay, useLiveGiftOverlay } from "@/features/live/live-gift-overlay";
import { LiveHeartBurst, type LiveHeartBurstHandle } from "@/features/live/live-heart-burst";
import { LiveTopGifters } from "@/features/live/live-top-gifters";
import { LiveCoverBackdrop } from "@/features/live/live-cover-backdrop";
import { AudienceAgoraView, type LivePlaybackState } from "@/features/live/audience-agora-view";
import { toLiveStreamPreview } from "@/features/live/live-stream-model";
import type { LiveChatMessage } from "@/features/live/live-view-mock-data";
import { getLive, getLiveTopGifters, getLiveToken, sendLiveGift, LiveApiError, type AgoraAccess, type LiveGift, type LiveSession } from "@/services/live.service";
import { connectLiveRoom, liveCommentErrorMessage, type LiveRealtimeComment } from "@/services/live-realtime.service";
import { mergeLiveChat, rememberDeletedComment } from "@/features/live/live-chat-buffer";
import { getLiveOverlayCommentLimit, isLiveHostComment, selectLiveOverlayComments } from "@/features/live/live-overlay-comments";
import { showAppToast } from "@/components/common/app-toast";
import { getWallet, invalidateWalletData, subscribeWalletDataInvalidation } from "@/services/wallet.service";
import { followUser, getUserProfile } from "@/services/user.service";

import { rememberGiftTransaction } from "./live-gift-payment";
import { nextViewerPlaybackState } from "./live-viewer-lifecycle";

type RoomTab = "chat" | "supporters";

const PINK = "#FF347B";
const BASIC_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😂", "🤣", "😊",
  "🙂", "😉", "😍", "🥰", "😘", "😎", "🤩", "🥳",
  "😋", "😜", "🤔", "😮", "😢", "😭", "😅", "🥺",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "👋", "👌",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "🎉",
] as const;
const roomTabs: { id: RoomTab; label: string }[] = [
  { id: "chat", label: "Trò chuyện" },
  { id: "supporters", label: "Top người tặng" },
];

const closeRoom = () => router.canGoBack() ? router.back() : router.replace("/(tabs)/live");
const formatCount = (count: number) => count >= 1000
  ? `${(count / 1000).toFixed(1).replace(".0", "")}K`
  : String(count);
const formatLikeCount = (count: number) => count >= 1000
  ? `${(count / 1000).toFixed(1).replace(".0", "")}k`
  : String(count);
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining].map((part) => String(part).padStart(2, "0")).join(":");
};

export function LiveViewerScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const streamId = Array.isArray(id) ? id[0] : id;
  const [live, setLive] = useState<LiveSession | null>(null);
  const [access, setAccess] = useState<AgoraAccess | null>(null);
  const accessRef = useRef<AgoraAccess | null>(null);
  const accessGeneration = useRef(0);
  const ended = useRef(false);
  const [playbackState, setPlaybackState] = useState<LivePlaybackState>("connecting");
  const [videoSession, setVideoSession] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const stream = live ? toLiveStreamPreview(live) : null;
  const { width, height } = useWindowDimensions();
  const isWide = width >= 900 && width >= height;
  const isTabletWide = isWide && width < 1200;
  const roomWidth = Math.min(width - 32, 1600);
  const chatWidth = Math.min(350, Math.max(300, Math.round(width * 0.25)));
  const stageWidth = roomWidth - chatWidth - 12;
  const stageHeight = Math.round(stageWidth * 9 / 16);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [pinnedComment, setPinnedComment] = useState<LiveRealtimeComment | null>(null);
  const [draft, setDraft] = useState("");
  const [followed, setFollowed] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followPending, setFollowPending] = useState(false);
  const [likes, setLikes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [roomTab, setRoomTab] = useState<RoomTab>("chat");
  const [mobileSheet, setMobileSheet] = useState<"gift" | "emoji" | null>(null);
  const giftTransactions = useRef(new Set<string>());
  const pendingGift = useRef<{ giftId: string; quantity: number; requestId: string } | null>(null);
  const sendingGift = useRef(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [topGifters, setTopGifters] = useState<{ userId: string; displayName: string; totalGiftCount: number; totalAmount: number }[]>([]);
  const { giftQueue, showGiftEvent, clearGiftEvents } = useLiveGiftOverlay();
  const chatScrollRef = useRef<ScrollView>(null);
  const deletedCommentIds = useRef(new Set<string>());
  const chatAtBottom = useRef(true);
  const [newComments, setNewComments] = useState(false);
  const heartBurstRef = useRef<LiveHeartBurstHandle>(null);
  const liveRoom = useRef<Awaited<ReturnType<typeof connectLiveRoom>> | null>(null);

  const updatePlaybackState = useCallback((next: LivePlaybackState) => {
    if (!ended.current) setPlaybackState((current) => nextViewerPlaybackState(current, next));
  }, []);
  const endSession = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    accessGeneration.current++;
    accessRef.current = null;
    setAccess(null);
    setPlaybackState("ended");
    setLive((current) => current ? { ...current, status: 4 } : current);
    setMobileSheet(null);
    clearGiftEvents();
  }, [clearGiftEvents]);
  const handleVideoError = useCallback(() => {
    if (ended.current) return;
    accessGeneration.current++;
    accessRef.current = null;
    setAccess(null);
    updatePlaybackState("error");
    const generation = accessGeneration.current;
    if (streamId) void getLive(streamId).then((session) => {
      if (generation === accessGeneration.current && session.status >= 4) endSession();
    }).catch(() => undefined);
  }, [streamId, endSession, updatePlaybackState]);

  useEffect(() => {
    if (!streamId) return;
    let active = true;
    ended.current = false;
    accessGeneration.current++;
    setLive(null);
    accessRef.current = null;
    setAccess(null);
    setPlaybackState("connecting");
    let loading = false;
    const load = async () => {
      if (loading || ended.current) return;
      loading = true;
      const generation = accessGeneration.current;
      try {
        const session = await getLive(streamId);
        if (!active || generation !== accessGeneration.current) return;
        setLive(session);
        setViewerCount(session.currentViewerCount);
        if (session.status >= 4) { endSession(); return; }
        if (session.status !== 2 && session.status !== 3) { setPlaybackState("waitingForHost"); return; }
        if (!accessRef.current) {
          const token = await getLiveToken(streamId);
          if (active && generation === accessGeneration.current) { accessRef.current = token; setAccess(token); }
        }
      } catch (error) { if (active && generation === accessGeneration.current) { if (error instanceof LiveApiError && error.code === "LIVE_ENDED") { endSession(); return; } if (__DEV__) console.error("[Live viewer] session/token failed", error); if (!accessRef.current) updatePlaybackState("error"); } }
      finally { loading = false; }
    };
    void load();
    const timer = setInterval(() => { void load(); }, 10_000);
    return () => { active = false; accessGeneration.current++; clearInterval(timer); };
  }, [streamId, endSession, updatePlaybackState]);

  const canObserveLive = (live?.status === 2 || live?.status === 3) && playbackState !== "ended";

  useEffect(() => {
    if (!streamId || !canObserveLive) return;
    let active = true;
    void connectLiveRoom(streamId, {
      onSnapshot: (snapshot) => {
        if (!active) return;
        void getLiveTopGifters(streamId).then((items) => { if (active) setTopGifters(items); }).catch(() => undefined);
        setViewerCount(snapshot.viewerCount);
        setLikes(snapshot.reactionCount);
        setPinnedComment(snapshot.pinnedComment && !deletedCommentIds.current.has(snapshot.pinnedComment.id) ? snapshot.pinnedComment : null);
        setMessages((current) => mergeLiveChat(current, snapshot.comments.filter((comment) => !deletedCommentIds.current.has(comment.id)).map((comment) => ({ id: comment.id, createdAt: comment.createdAt, userId: comment.userId, name: comment.name, avatarUrl: comment.avatarUrl ?? undefined, text: comment.text }))));
      },
      onComment: (comment) => { if (active && !deletedCommentIds.current.has(comment.id)) { setMessages((current) => mergeLiveChat(current, [{ id: comment.id, createdAt: comment.createdAt, userId: comment.userId, name: comment.name, avatarUrl: comment.avatarUrl ?? undefined, text: comment.text }])); if (!chatAtBottom.current) setNewComments(true); } },
      onCommentDeleted: (commentId) => { if (active) { rememberDeletedComment(deletedCommentIds.current, commentId); setMessages((current) => current.filter((item) => item.id !== commentId)); setPinnedComment((current) => current?.id === commentId ? null : current); } },
      onPinnedComment: (comment) => { if (active) setPinnedComment(comment && !deletedCommentIds.current.has(comment.id) ? comment : null); },
      onViewerCount: (count) => { if (active) setViewerCount(count); },
      onReaction: (count) => { if (active) { setLikes((current) => current + count); heartBurstRef.current?.burst(); } },
      onGift: (gift) => {
        if (!active || !rememberGiftTransaction(giftTransactions.current, gift.transactionId ?? gift.id)) return;
        invalidateWalletData();
        showGiftEvent(gift);
        void getLiveTopGifters(streamId).then((items) => { if (active) setTopGifters(items); }).catch(() => undefined);
      },
      onEnded: () => { if (active) endSession(); },
      onDisconnected: () => {
        if (!active) return;
        void getLive(streamId).then((session) => { if (active && session.status >= 4) endSession(); }).catch(() => undefined);
      },
    }).then((room) => { if (active) liveRoom.current = room; else void room.close(); }).catch((error) => { if (active && __DEV__) console.error("[Live viewer] chat connection failed", error); });
    return () => { active = false; const room = liveRoom.current; liveRoom.current = null; void room?.close(); };
  }, [streamId, canObserveLive, showGiftEvent, endSession]);

  useEffect(() => {
    giftTransactions.current.clear();
    pendingGift.current = null;
    clearGiftEvents();
    setTopGifters([]);
    setPinnedComment(null);
  }, [streamId, clearGiftEvents]);

  useEffect(() => {
    if (!live?.startedAt || playbackState === "ended") return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(live.startedAt!).getTime()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [live?.startedAt, playbackState]);

  const renewToken = async () => {
    if (!streamId || ended.current) return;
    const generation = accessGeneration.current;
    try { const token = await getLiveToken(streamId, true); if (generation !== accessGeneration.current) return; accessRef.current = token; setAccess(token); }
    catch (error) { if (generation !== accessGeneration.current) return; if (error instanceof LiveApiError && error.code === "LIVE_ENDED") { endSession(); return; } if (__DEV__) console.error("[Live viewer] token renewal failed", error); handleVideoError(); }
  };

  const retryVideo = async () => {
    if (!streamId || ended.current) return;
    const generation = ++accessGeneration.current;
    accessRef.current = null;
    setAccess(null);
    setPlaybackState("connecting");
    try {
      const token = await getLiveToken(streamId, true);
      if (generation !== accessGeneration.current) return;
      accessRef.current = token;
      setVideoSession((current) => current + 1);
      setAccess(token);
    } catch (error) {
      if (generation !== accessGeneration.current) return;
      if (error instanceof LiveApiError && error.code === "LIVE_ENDED") { endSession(); return; }
      if (__DEV__) console.error("[Live viewer] retry failed", error);
      handleVideoError();
    }
  };

  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = () => { void getWallet().then((wallet) => { if (active) setWalletBalance(wallet.availableBalance); }).catch(() => { if (active) setWalletBalance(null); }); };
    refresh();
    const unsubscribe = subscribeWalletDataInvalidation(refresh);
    return () => { active = false; unsubscribe(); };
  }, []));

  useEffect(() => {
    if (!live?.hostUserId) return;
    let active = true;
    void getUserProfile(live.hostUserId).then((profile) => {
      if (active) { setFollowed(profile.isFollowing); setFollowerCount(profile.followerCount); }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [live?.hostUserId]);

  const toggleHostFollow = async () => {
    if (!live?.hostUserId || followPending) return;
    setFollowPending(true);
    try {
      const result = await followUser(live.hostUserId);
      setFollowed(result.isFollowing);
      setFollowerCount(result.followerCount);
    } catch {
      showAppToast({ title: "Không thể cập nhật theo dõi", message: "Vui lòng thử lại.", type: "error" });
    } finally { setFollowPending(false); }
  };

  if (playbackState === "ended") {
    return <SafeAreaView style={styles.missingRoom}>
      <Ionicons color={PINK} name="videocam-off-outline" size={48} />
      <Text style={styles.missingTitle}>Phiên Live đã kết thúc</Text>
      <Text style={{ color: "#AAB8CA", textAlign: "center", marginBottom: 12 }}>Chủ phòng đã kết thúc buổi phát trực tiếp. Cảm ơn bạn đã theo dõi!</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace("/(tabs)/live")} style={styles.returnButton}>
        <Text style={styles.returnText}>Về danh sách Live</Text>
      </Pressable>
    </SafeAreaView>;
  }
  if (!stream) {
    return <SafeAreaView style={styles.missingRoom}>
      <Ionicons color="#AAB8CA" name="radio-outline" size={38} />
      <Text style={styles.missingTitle}>Không tìm thấy buổi live</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace("/(tabs)/live")} style={styles.returnButton}>
        <Text style={styles.returnText}>Xem danh sách Live</Text>
      </Pressable>
    </SafeAreaView>;
  }

  const source = stream.thumbnailUrl ? { uri: stream.thumbnailUrl } : undefined;
  const hostUserId = live?.hostUserId;
  const hostAvatarUrl = live?.hostAvatarUrl;
  const chatMessages = messages.filter((item) => item.kind !== "gift");
  const overlayComments = selectLiveOverlayComments(chatMessages, pinnedComment ? {
    id: pinnedComment.id, createdAt: pinnedComment.createdAt, userId: pinnedComment.userId,
    name: pinnedComment.name, avatarUrl: pinnedComment.avatarUrl ?? undefined, text: pinnedComment.text,
  } : null, getLiveOverlayCommentLimit(width, height));
  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !liveRoom.current) return;
    try { await liveRoom.current.sendComment(text); setDraft(""); }
    catch (error) { showAppToast({ title: "Không gửi được bình luận", message: liveCommentErrorMessage(error), type: "error" }); }
  };
  const shareRoom = () => void Share.share({ message: `Xem ${stream.creator} đang Live trên ANKT: ${stream.title}` });
  const likeRoom = () => {
    setLikes((current) => current + 1);
    heartBurstRef.current?.burst();
    void liveRoom.current?.react(1).catch(() => undefined);
  };
  const sendGift = async (gift: LiveGift, quantity: number) => {
    if (!streamId || !live?.allowGifts || sendingGift.current) throw new Error("Quà tặng hiện không khả dụng.");
    sendingGift.current = true;
    const requestId = pendingGift.current?.giftId === gift.id && pendingGift.current.quantity === quantity
      ? pendingGift.current.requestId : globalThis.crypto?.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const digit = Math.floor(Math.random() * 16);
      return (char === "x" ? digit : (digit & 3) | 8).toString(16);
    });
    pendingGift.current = { giftId: gift.id, quantity, requestId };
    try {
      const result = await sendLiveGift(streamId, gift.id, quantity, requestId, gift.price);
      pendingGift.current = null;
      setWalletBalance(result.senderBalance);
      invalidateWalletData();
      setMobileSheet(null);
    } catch (error) {
      if (error instanceof LiveApiError && error.status >= 400 && error.status < 500) pendingGift.current = null;
      throw error;
    } finally { sendingGift.current = false; }
  };

  const host = <View style={styles.host}>
    <LiveCreatorAvatar size={36} stream={stream} />
    <View style={styles.hostCopy}>
      <Text numberOfLines={1} style={styles.hostName}>{stream.creator} <Text style={styles.verified}>✦</Text></Text>
      <Text style={styles.hostMeta}>{formatCount(followerCount ?? stream.followerCount)} người theo dõi</Text>
    </View>
    <Pressable accessibilityLabel={followed ? "Bỏ theo dõi" : "Theo dõi"} accessibilityRole="button" disabled={followPending} onPress={() => void toggleHostFollow()} style={[styles.followButton, followed && styles.followedButton]}>
      <Text style={styles.followText}>{followed ? "Đã theo dõi" : "+ Follow"}</Text>
    </Pressable>
  </View>;

  const liveStatus = <View style={[styles.liveStatus, !isWide && styles.mobileLiveStatus]}>
    <View style={[styles.livePill, !isWide && styles.mobileLivePill]}><Ionicons color="#FFFFFF" name="radio" size={isWide ? 13 : 11} /><Text style={[styles.livePillText, !isWide && styles.mobileStatusText]}>LIVE</Text></View>
    <Text style={[styles.timer, !isWide && styles.mobileStatusText]}>{formatDuration(elapsedSeconds)}</Text>
    <View style={[styles.viewersPill, !isWide && styles.mobileViewersPill]}><Ionicons color="#FFFFFF" name="eye" size={isWide ? 13 : 11} /><Text style={[styles.viewersText, !isWide && styles.mobileStatusText]}>{formatCount(viewerCount)}</Text></View>
  </View>;

  const composer = <View style={[styles.composer, isWide ? styles.sidebarComposer : styles.mobileComposer]}>
    <TextInput
      accessibilityLabel="Nhập bình luận Live"
      onChangeText={setDraft}
      onFocus={() => setMobileSheet(null)}
      onSubmitEditing={() => void sendMessage()}
      placeholder="Nhập bình luận..."
      placeholderTextColor="#A9B7C7"
      returnKeyType="send"
      style={styles.composerInput}
      value={draft}
    />
    <Pressable accessibilityLabel="Mở emoji" accessibilityRole="button" accessibilityState={{ expanded: mobileSheet === "emoji" }} onPress={() => { Keyboard.dismiss(); setMobileSheet((current) => current === "emoji" ? null : "emoji"); }} style={styles.mobileComposerAction}><Ionicons color={mobileSheet === "emoji" ? PINK : "#FFFFFF"} name="happy-outline" size={isWide ? 19 : 22} /></Pressable>
    {live?.allowGifts ? <Pressable accessibilityLabel="Mở quà tặng" accessibilityRole="button" accessibilityState={{ expanded: isWide && mobileSheet === "gift" }} onPress={() => { Keyboard.dismiss(); setMobileSheet((current) => current === "gift" ? null : "gift"); }} style={styles.mobileComposerAction}><Ionicons color={isWide && mobileSheet === "gift" ? PINK : "#FFFFFF"} name="gift-outline" size={isWide ? 19 : 22} /></Pressable> : null}
    <Pressable accessibilityLabel="Gửi bình luận" accessibilityRole="button" disabled={!draft.trim() || !liveRoom.current || !live?.allowComments} onPress={() => void sendMessage()} style={styles.sendButton}>
      <Ionicons color={draft.trim() ? PINK : "#A9B7C7"} name="send" size={19} />
    </Pressable>
  </View>;

  const emojiPanel = <View accessibilityLabel="Bộ emoji cơ bản" style={styles.emojiGrid}>
    {BASIC_EMOJIS.map((emoji) => <Pressable
      accessibilityLabel={`Thêm ${emoji} vào bình luận`}
      accessibilityRole="button"
      key={emoji}
      onPress={() => setDraft((current) => current + emoji)}
      style={({ pressed }) => [styles.emojiButton, pressed && styles.emojiButtonPressed]}
    ><Text style={styles.emojiText}>{emoji}</Text></Pressable>)}
  </View>;

  return <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
    <StatusBar backgroundColor="#081422" style="light" />
    {isWide ? (
      <ScrollView contentContainerStyle={[styles.desktopScroll, isTabletWide && { justifyContent: "center", minHeight: height }]} style={styles.desktopScrollView}>
        <View style={[styles.desktopRow, { width: roomWidth }]}>
          <View style={{ width: stageWidth }}>
            <View style={[styles.stage, { height: stageHeight }]}>
              {(playbackState === "connecting" || playbackState === "waitingForHost") ? <LiveCoverBackdrop source={source} /> : null}
              {access ? <AudienceAgoraView key={videoSession} access={access} onPlaybackStateChange={updatePlaybackState} onError={handleVideoError} onTokenWillExpire={() => void renewToken()} style={styles.stageImage} /> : null}
              <StageShade />
              <PlaybackStatus state={playbackState} onRetry={() => void retryVideo()} />
              <View style={styles.desktopTop}><View>{host}</View><View style={styles.statusRight}>{liveStatus}<Pressable accessibilityLabel="Đóng Live" accessibilityRole="button" onPress={closeRoom} style={styles.closeButton}><Ionicons color="#FFFFFF" name="close" size={21} /></Pressable></View></View>
              <LiveGiftOverlay manager={giftQueue} />
              <View style={styles.desktopStageActions}><View style={styles.heartAction}><ActionButton accessibilityLabel="Thích Live" icon="heart" label={formatLikeCount(likes)} onPress={likeRoom} /><LiveHeartBurst ref={heartBurstRef} /></View><ActionButton icon="share-social-outline" label="Chia sẻ" onPress={shareRoom} /></View>
            </View>
          </View>
          <View style={[styles.sidebar, { height: Math.max(stageHeight, mobileSheet === "gift" ? 500 : 430), width: chatWidth }]}>
            <View style={styles.roomTabs}>{roomTabs.map((tab) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: roomTab === tab.id }} key={tab.id} onPress={() => setRoomTab(tab.id)} style={[styles.roomTab, roomTab === tab.id && styles.roomTabActive]}><Text style={[styles.roomTabText, roomTab === tab.id && styles.roomTabTextActive]}>{tab.label}</Text></Pressable>)}</View>
            {roomTab === "chat" && pinnedComment ? <View style={styles.pinnedSidebar}><LiveOverlayComment avatarUrl={pinnedComment.avatarUrl ?? (isLiveHostComment(pinnedComment.userId, hostUserId) ? hostAvatarUrl : null)} isHost={isLiveHostComment(pinnedComment.userId, hostUserId)} isPinned name={pinnedComment.name} text={pinnedComment.text} /></View> : null}
            {roomTab === "chat" ? <><ScrollView contentContainerStyle={styles.sidebarList} onContentSizeChange={() => { if (chatAtBottom.current) chatScrollRef.current?.scrollToEnd({ animated: false }); }} onScroll={(event) => { const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent; chatAtBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40; if (chatAtBottom.current) setNewComments(false); }} scrollEventThrottle={100} ref={chatScrollRef} style={styles.sidebarMessages}>
              {chatMessages.filter((item) => item.id !== pinnedComment?.id).map((item) => <ChatLine hostAvatarUrl={hostAvatarUrl} isHost={isLiveHostComment(item.userId, hostUserId)} item={item} key={item.id} />)}
            </ScrollView>{newComments ? <Pressable accessibilityRole="button" onPress={() => { chatAtBottom.current = true; chatScrollRef.current?.scrollToEnd({ animated: true }); setNewComments(false); }}><Text style={{ color: PINK, textAlign: "center", padding: 8 }}>Bình luận mới ↓</Text></Pressable> : null}</> : <LiveTopGifters gifters={topGifters} mode="sidebar" />}
            <View style={styles.sidebarInput}>{composer}</View>
            <LiveGiftSheet balance={walletBalance} inline onClose={() => setMobileSheet(null)} onSendGift={sendGift} visible={mobileSheet === "gift"} />
            {mobileSheet === "emoji" ? <View style={[styles.inlineEmojiSheet, { height: Math.min(300, Math.max(220, height * 0.32)) }]}><View style={styles.inlineEmojiHeader}><Text style={styles.inlineEmojiTitle}>Emoji cơ bản</Text><Pressable accessibilityLabel="Đóng emoji" accessibilityRole="button" onPress={() => setMobileSheet(null)}><Ionicons color="#FFFFFF" name="close" size={19} /></Pressable></View><ScrollView style={styles.inlineEmojiBody}>{emojiPanel}</ScrollView></View> : null}
          </View>
        </View>
      </ScrollView>
    ) : (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.mobileStage, width >= 600 && styles.tabletStage]}>
        {(playbackState === "connecting" || playbackState === "waitingForHost") ? <LiveCoverBackdrop source={source} /> : null}
        {access ? <AudienceAgoraView key={videoSession} access={access} onPlaybackStateChange={updatePlaybackState} onError={handleVideoError} onTokenWillExpire={() => void renewToken()} style={styles.stageImage} /> : null}
        <StageShade mobile />
        <PlaybackStatus state={playbackState} onRetry={() => void retryVideo()} />
        <LiveGiftOverlay compact manager={giftQueue} />
        <View style={styles.mobileTop}><View style={styles.mobileTopLine}>{host}<Pressable accessibilityLabel="Đóng Live" accessibilityRole="button" onPress={closeRoom} style={styles.closeButton}><Ionicons color="#FFFFFF" name="close" size={22} /></Pressable></View><View style={styles.mobileStatusLine}>{liveStatus}</View><LiveTopGifters gifters={topGifters} mode="mobile" /></View>
        <View style={styles.mobileChat}>{overlayComments.pinned ? <LiveOverlayComment avatarUrl={overlayComments.pinned.avatarUrl ?? (isLiveHostComment(overlayComments.pinned.userId, hostUserId) ? hostAvatarUrl : null)} isHost={isLiveHostComment(overlayComments.pinned.userId, hostUserId)} isPinned key={`pinned-${overlayComments.pinned.id}`} name={overlayComments.pinned.name} text={overlayComments.pinned.text} /> : null}{overlayComments.recent.map((item) => <LiveOverlayComment avatarUrl={item.avatarUrl ?? (isLiveHostComment(item.userId, hostUserId) ? hostAvatarUrl : null)} isHost={isLiveHostComment(item.userId, hostUserId)} key={item.id} name={item.name} stickerUrl={item.stickerUrl} text={item.text} />)}</View>
        <View style={styles.mobileBottom}>{composer}<View style={styles.mobileActions}><View style={styles.heartAction}><ActionButton accessibilityLabel="Thích Live" icon="heart" label={formatLikeCount(likes)} onPress={likeRoom} /><LiveHeartBurst ref={heartBurstRef} /></View><ActionButton icon="share-social-outline" label="Chia sẻ" onPress={shareRoom} /></View></View>
      </KeyboardAvoidingView>
    )}
    {!isWide ? <LiveGiftSheet balance={walletBalance} onClose={() => setMobileSheet(null)} onSendGift={sendGift} visible={mobileSheet === "gift"} /> : null}
    {!isWide ? <Modal animationType="slide" onRequestClose={() => setMobileSheet(null)} transparent visible={mobileSheet === "emoji"}>
      <View style={styles.emojiOverlay}><Pressable accessibilityLabel="Đóng emoji" onPress={() => setMobileSheet(null)} style={styles.emojiBackdrop} /><SafeAreaView edges={["bottom"]} style={styles.emojiSheet}><View style={styles.emojiSheetTitle}><Text style={styles.emojiTitle}>Emoji cơ bản</Text><Pressable accessibilityLabel="Đóng emoji" onPress={() => setMobileSheet(null)}><Ionicons color="#FFFFFF" name="close" size={24} /></Pressable></View><ScrollView style={styles.mobileEmojiBody}>{emojiPanel}</ScrollView></SafeAreaView></View>
    </Modal> : null}
  </SafeAreaView>;
}

function ChatLine({ item, isHost, hostAvatarUrl }: { item: LiveChatMessage; isHost: boolean; hostAvatarUrl?: string | null }) {
  if (isHost) return <LiveOverlayComment avatarUrl={item.avatarUrl ?? hostAvatarUrl} isHost name={item.name} stickerUrl={item.stickerUrl} text={item.text} />;
  return <View style={styles.chatLine}>
    <UserAvatar displayName={item.name} imageUrl={item.avatarUrl} size={23} />
    {item.stickerUrl ? <View><Text style={styles.chatName}>{item.name}</Text><Image contentFit="contain" source={{ uri: item.stickerUrl }} style={styles.chatSticker} /></View> : <Text numberOfLines={3} style={styles.chatText}><Text style={styles.chatName}>{item.name}</Text>{" · "}{item.text}</Text>}
  </View>;
}

function PlaybackStatus({ state, onRetry }: { state: LivePlaybackState; onRetry: () => void }) {
  if (state === "playing") return null;
  const label = { connecting: "Đang kết nối video…", waitingForHost: "Đang chờ camera của chủ Live…", reconnecting: "Đang kết nối lại video…", ended: "Buổi Live đã kết thúc", error: "Không thể phát video Live" }[state];
  return <View pointerEvents="box-none" style={{ position: "absolute", top: "40%", left: 20, right: 20, alignItems: "center", zIndex: 2 }}>
    <Text accessibilityLiveRegion="polite" style={{ color: "white", backgroundColor: "#152030", padding: 12, borderRadius: 12 }}>{label}</Text>
    {state === "error" ? <Pressable accessibilityRole="button" onPress={onRetry} style={{ backgroundColor: PINK, marginTop: 8, padding: 12, borderRadius: 12 }}><Text style={{ color: "white" }}>Thử lại video</Text></Pressable> : null}
  </View>;
}

function StageShade({ mobile = false }: { mobile?: boolean }) {
  return <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFillObject} width="100%">
    <Defs>
      <LinearGradient id="liveShade" x1="0%" x2="0%" y1="0%" y2="100%">
        <Stop offset="0%" stopColor="#050B18" stopOpacity={mobile ? 0.58 : 0.42} />
        <Stop offset="22%" stopColor="#050B18" stopOpacity="0.05" />
        <Stop offset="58%" stopColor="#050B18" stopOpacity="0.02" />
        <Stop offset="100%" stopColor="#050B18" stopOpacity={mobile ? 0.83 : 0.72} />
      </LinearGradient>
    </Defs>
    <Rect fill="url(#liveShade)" height="100%" width="100%" />
  </Svg>;
}

function ActionButton({ accessibilityLabel, icon, label, onPress }: { accessibilityLabel?: string; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={accessibilityLabel ?? label} accessibilityRole="button" onPress={onPress} style={styles.actionButton}><Ionicons color="#FFFFFF" name={icon} size={21} /><Text style={styles.actionLabel}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#081422", flex: 1 },
  desktopScrollView: { flex: 1 },
  desktopScroll: { alignItems: "center", padding: 16 },
  desktopRow: { flexDirection: "row", gap: 12 },
  stage: { backgroundColor: "#15233A", borderRadius: 16, overflow: "hidden", position: "relative", width: "100%" },
  stageImage: { ...StyleSheet.absoluteFillObject },
  desktopTop: { flexDirection: "row", justifyContent: "space-between", left: 14, position: "absolute", right: 14, top: 8, zIndex: 4 },
  host: { alignItems: "center", flexDirection: "row", gap: 7, maxWidth: 270 },
  hostCopy: { flexShrink: 1 },
  hostName: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  verified: { color: PINK },
  hostMeta: { color: "#DFE7F1", fontSize: 10, marginTop: 2 },
  followButton: { backgroundColor: PINK, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 },
  followedButton: { backgroundColor: "#536278" },
  followText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  hostBadges: { flexDirection: "row", gap: 5, marginTop: 8 },
  hostBadge: { backgroundColor: "rgba(9, 17, 30, 0.55)", borderRadius: 9, color: "#FFFFFF", fontSize: 10, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 4 },
  statusRight: { alignItems: "center", flexDirection: "row", gap: 8 },
  liveStatus: { alignItems: "center", backgroundColor: "rgba(5, 13, 25, 0.72)", borderRadius: 11, flexDirection: "row", gap: 6, overflow: "hidden", paddingRight: 7 },
  mobileLiveStatus: { borderRadius: 9, gap: 4, paddingRight: 5 },
  livePill: { alignItems: "center", backgroundColor: PINK, flexDirection: "row", gap: 4, paddingHorizontal: 9, paddingVertical: 7 },
  mobileLivePill: { gap: 3, paddingHorizontal: 7, paddingVertical: 5 },
  livePillText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  mobileStatusText: { fontSize: 10 },
  timer: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  viewersPill: { alignItems: "center", flexDirection: "row", gap: 4 },
  mobileViewersPill: { gap: 3 },
  viewersText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  closeButton: { alignItems: "center", backgroundColor: "rgba(8, 17, 29, 0.62)", borderRadius: 18, height: 35, justifyContent: "center", width: 35 },
  desktopStageActions: { bottom: 12, flexDirection: "row", gap: 8, position: "absolute", right: 14, zIndex: 4 },
  composer: { alignItems: "center", backgroundColor: "rgba(16, 29, 46, 0.78)", borderRadius: 24, flexDirection: "row", height: 38, maxWidth: 310, minWidth: 170, paddingLeft: 12, width: "43%" },
  sidebarComposer: { maxWidth: undefined, minWidth: 0, width: "100%" },
  mobileComposer: { flex: 1, height: 48, maxWidth: "100%", minWidth: 0, width: "auto" },
  mobileComposerAction: { alignItems: "center", height: 44, justifyContent: "center", width: 40 },
  composerInput: { color: "#FFFFFF", flex: 1, fontSize: 12, height: "100%", paddingVertical: 0 },
  sendButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  actionButton: { alignItems: "center", backgroundColor: "rgba(14, 27, 44, 0.72)", borderRadius: 12, gap: 3, minWidth: 48, paddingHorizontal: 8, paddingVertical: 6 },
  heartAction: { position: "relative" },
  actionLabel: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  chatLine: { alignItems: "flex-start", flexDirection: "row", gap: 7, paddingVertical: 4 },
  chatText: { color: "#DAE5F1", flex: 1, fontSize: 12, lineHeight: 17 },
  chatName: { color: "#FFFFFF", fontWeight: "800" },
  chatSticker: { height: 54, width: 54 },
  sidebar: { backgroundColor: "#0E1B2A", borderRadius: 15, overflow: "hidden" },
  roomTabs: { alignItems: "center", flexDirection: "row", justifyContent: "space-around", minHeight: 48, paddingHorizontal: 5 },
  roomTab: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  roomTabActive: { backgroundColor: "rgba(255, 52, 123, 0.12)" },
  roomTabText: { color: "#A9B9C9", fontSize: 11, fontWeight: "700" },
  roomTabTextActive: { color: "#FFFFFF" },
  sidebarMessages: { flex: 1 },
  pinnedSidebar: { padding: 8 },
  sidebarInput: { padding: 9 },
  sidebarList: { paddingHorizontal: 10, paddingVertical: 8 },
  inlineEmojiSheet: { backgroundColor: "#0E1B2A", borderTopColor: "#20384C", borderTopWidth: 1, overflow: "hidden", padding: 8 },
  inlineEmojiHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 30, paddingHorizontal: 4 },
  inlineEmojiTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  inlineEmojiBody: { flex: 1 },
  mobileStage: { backgroundColor: "#0E1725", flex: 1, overflow: "hidden" },
  tabletStage: { alignSelf: "center", maxWidth: 640, width: "100%" },
  mobileTop: { left: 10, position: "absolute", right: 10, top: 10, zIndex: 4 },
  mobileTopLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  mobileStatusLine: { alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "space-between", marginTop: 8 },
  mobileBadges: { flex: 1, flexDirection: "row", gap: 3, minWidth: 0 },
  mobileHostBadge: { flexShrink: 1, fontSize: 9, paddingHorizontal: 5, paddingVertical: 4 },
  mobileChat: { bottom: 72, gap: 4, left: 8, maxWidth: "82%", position: "absolute", right: 8, zIndex: 4 },
  mobileActions: { gap: 6, marginLeft: 6 },
  mobileBottom: { alignItems: "flex-end", bottom: 8, flexDirection: "row", left: 8, position: "absolute", right: 8, zIndex: 4 },
  mobileEmojiBody: { maxHeight: 352 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingVertical: 4 },
  emojiButton: { alignItems: "center", borderRadius: 8, height: 44, justifyContent: "center", width: 44 },
  emojiButtonPressed: { backgroundColor: "rgba(255, 255, 255, 0.12)" },
  emojiText: { fontSize: 26, lineHeight: 34 },
  emojiOverlay: { flex: 1, justifyContent: "flex-end" },
  emojiBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.52)" },
  emojiSheet: { backgroundColor: "#0E1B2A", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 12 },
  emojiSheetTitle: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 12 },
  emojiTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  missingRoom: { alignItems: "center", backgroundColor: "#081422", flex: 1, gap: 12, justifyContent: "center", paddingHorizontal: 24 },
  missingTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  returnButton: { backgroundColor: PINK, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  returnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
