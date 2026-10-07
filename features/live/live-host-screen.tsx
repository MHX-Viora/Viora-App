import Ionicons from "@expo/vector-icons/Ionicons";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { showAppToast } from "@/components/common/app-toast";
import { createLive, endLive, getActiveLive, getAgoraConfig, getLive, getLiveTopGifters, getLiveToken, heartbeatLive, startLive, uploadLiveCover, type LiveSession } from "@/services/live.service";
import { connectLiveRoom, type LiveRealtimeComment } from "@/services/live-realtime.service";
import { getUser } from "@/stores/session-store";
import { mergeLiveChat, rememberDeletedComment } from "./live-chat-buffer";
import type { LiveHeartBurstHandle } from "./live-heart-burst";
import type { HostAgoraPreviewHandle } from "./host-agora-preview";
import { demoHostComments, formatHostDuration, getHostTopGifters, initialHostSettings, type HostComment, type HostSettings } from "./live-host-model";
import { LiveHostRoom } from "./live-host-room";
import { LiveHostSetup } from "./live-host-setup";
import { LiveCoverImage } from "./live-cover-image";
import { useLiveGiftOverlay } from "./live-gift-overlay";
import type { LiveTopGifter } from "./live-top-gifters-model";
import { isHostMobileViewport } from "./live-host-viewport";
import { HostButton, HostHeading, HostPanel, hostColors } from "./live-host-ui";

import { invalidateWalletData } from "@/services/wallet.service";
import { rememberGiftTransaction } from "./live-gift-payment";
import { LiveHostGiftIncomeSummary } from "./live-host-gift-income-summary";

type Phase = "setup" | "check" | "countdown" | "live" | "summary";

export function LiveHostScreen() {
  const { width, height } = useWindowDimensions();
  const mobileViewport = isHostMobileViewport(width, height);
  const giftTransactions = useRef(new Set<string>());
  const [phase, setPhase] = useState<Phase>("setup");
  const [agoraAppId, setAgoraAppId] = useState("");
  const [liveId, setLiveId] = useState<string | null>(null);
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [activeLive, setActiveLive] = useState<LiveSession | null>(null);
  const [checkingActive, setCheckingActive] = useState(true);
  const [endingActive, setEndingActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const agoraRef = useRef<HostAgoraPreviewHandle | null>(null);
  const heartBurstRef = useRef<LiveHeartBurstHandle | null>(null);
  const [settings, setSettings] = useState<HostSettings>(initialHostSettings);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraSession, setCameraSession] = useState(0);
  const [microphoneOn, setMicrophoneOn] = useState(true);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [endRequested, setEndRequested] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [endedAt, setEndedAt] = useState<Date | null>(null);
  const [comments, setComments] = useState<HostComment[]>([]);
  const [pinnedComment, setPinnedComment] = useState<HostComment | null>(null);
  const [topGifters, setTopGifters] = useState<LiveTopGifter[]>([]);
  const { giftQueue, showGiftEvent, clearGiftEvents } = useLiveGiftOverlay();
  const deletedCommentIds = useRef(new Set<string>());
  const [viewerCount, setViewerCount] = useState(0);
  const [reactionCount, setReactionCount] = useState(0);
  const [summarySession, setSummarySession] = useState<LiveSession | null>(null);
  const [realtimeRetry, setRealtimeRetry] = useState(0);
  const realtimeRef = useRef<Awaited<ReturnType<typeof connectLiveRoom>> | null>(null);
  const [connected, setConnected] = useState(Platform.OS === "web" ? typeof navigator !== "undefined" ? navigator.onLine : true : true);

  useEffect(() => {
    let mounted = true;
    void getActiveLive().then((live) => { if (mounted) setActiveLive(live); })
      .catch(() => { if (mounted) showAppToast({ title: "Không kiểm tra được Live đang phát", message: "Vui lòng kiểm tra kết nối và thử lại.", type: "error" }); })
      .finally(() => { if (mounted) setCheckingActive(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (phase !== "live" || !liveId || demoMode) return;
    let inFlight = false;
    const send = async () => {
      if (inFlight) return;
      inFlight = true;
      try { await heartbeatLive(liveId); }
      catch { /* The server will end this session if the host stays disconnected. */ }
      finally { inFlight = false; }
    };
    void send();
    const timer = setInterval(() => void send(), 15_000);
    return () => clearInterval(timer);
  }, [phase, liveId, demoMode]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const online = () => setConnected(true);
    const offline = () => setConnected(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    const timer = setTimeout(() => {
      if (countdown > 1) setCountdown(countdown - 1);
      else if (demoMode) { setStartedAt(new Date()); setPhase("live"); }
      else if (liveId) {
        void startLive(liveId).then((result) => { setStartedAt(new Date(result.startedAt)); setPhase("live"); }).catch(async () => {
          showAppToast({ title: "Không thể bắt đầu Live", message: "Vui lòng kiểm tra kết nối và thử lại.", type: "error" });
          await agoraRef.current?.leave();
          await endLive(liveId).catch(() => undefined);
          setLiveId(null);
          setPhase("check");
        });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, demoMode, liveId]);

  useEffect(() => {
    if (phase !== "live") return;
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live" || !liveId || demoMode) return;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const toHostComment = (comment: LiveRealtimeComment): HostComment => ({ id: comment.id, createdAt: comment.createdAt, userId: comment.userId, name: comment.name, avatarUrl: comment.avatarUrl, text: comment.text, time: new Date(comment.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) });
    void connectLiveRoom(liveId, {
      onSnapshot: (snapshot) => { if (active) { void getLiveTopGifters(liveId).then((items) => { if (active) setTopGifters(items); }).catch(() => undefined); setConnected(true); setViewerCount(snapshot.viewerCount); setReactionCount(snapshot.reactionCount); setPinnedComment(snapshot.pinnedComment && !deletedCommentIds.current.has(snapshot.pinnedComment.id) ? toHostComment(snapshot.pinnedComment) : null); setComments((items) => mergeLiveChat(items, snapshot.comments.filter((comment) => !deletedCommentIds.current.has(comment.id)).map(toHostComment))); } },
      onComment: (comment) => { if (active && !deletedCommentIds.current.has(comment.id)) setComments((items) => mergeLiveChat(items, [toHostComment(comment)])); },
      onCommentDeleted: (commentId) => { if (active) { rememberDeletedComment(deletedCommentIds.current, commentId); setComments((items) => items.filter((item) => item.id !== commentId)); setPinnedComment((current) => current?.id === commentId ? null : current); } },
      onPinnedComment: (comment) => { if (active) setPinnedComment(comment && !deletedCommentIds.current.has(comment.id) ? toHostComment(comment) : null); },
      onViewerCount: (count) => { if (active) setViewerCount(count); },
      onReaction: (count) => { if (active) { setReactionCount((value) => value + count); heartBurstRef.current?.burst(); } },
      onGift: (gift) => {
        if (!active || !rememberGiftTransaction(giftTransactions.current, gift.transactionId ?? gift.id)) return;
        invalidateWalletData();
        showGiftEvent(gift);
        void getLiveTopGifters(liveId).then((items) => { if (active) setTopGifters(items); }).catch(() => undefined);
      },
      onEnded: () => { if (active) { setEndedAt(new Date()); setPhase("summary"); } },
      onDisconnected: () => { if (active) { setConnected(false); setRealtimeRetry((value) => value + 1); } },
    }).then((connection) => { if (active) realtimeRef.current = connection; else void connection.close(); }).catch(() => { if (active) { setConnected(false); retryTimer = setTimeout(() => setRealtimeRetry((value) => value + 1), 5000); } });
    return () => { active = false; if (retryTimer) clearTimeout(retryTimer); const connection = realtimeRef.current; realtimeRef.current = null; void connection?.close(); };
  }, [phase, liveId, demoMode, realtimeRetry, showGiftEvent]);

  const leave = () => router.canGoBack() ? router.back() : router.replace("/(tabs)/live");
  const setLivePinnedComment = async (commentId: string | null) => {
    if (demoMode) {
      setPinnedComment(commentId ? comments.find((item) => item.id === commentId) ?? null : null);
      return;
    }
    if (!realtimeRef.current) throw new Error("Chưa kết nối trò chuyện Live");
    await realtimeRef.current.setPinnedComment(commentId);
  };
  const endPreviousLive = async () => {
    if (!activeLive || endingActive) return;
    setEndingActive(true);
    try {
      await endLive(activeLive.id);
      setActiveLive(null);
      showAppToast({ title: "Đã kết thúc Live cũ", message: "Bạn có thể tạo buổi Live mới.", type: "success" });
    } catch (error) {
      showAppToast({ title: "Không thể kết thúc Live", message: error instanceof Error ? error.message : "Vui lòng thử lại.", type: "error" });
    } finally { setEndingActive(false); }
  };
  const enterCheck = async () => {
    if (checkingActive || activeLive) return;
    try {
      const config = await getAgoraConfig();
      setAgoraAppId(config.appId);
      setPhase("check");
    } catch {
      showAppToast({ title: "Chưa thể mở camera Live", message: "Dịch vụ Agora chưa sẵn sàng. Vui lòng thử lại sau.", type: "error" });
    }
  };
  const askPermissions = async () => {
    try {
      await Promise.all([requestCameraPermission(), requestMicrophonePermission()]);
    } catch {
      showAppToast({ title: "Không thể kiểm tra thiết bị", message: "Kiểm tra quyền camera và micro trong cài đặt thiết bị.", type: "error" });
    }
  };
  const requestOrRetryCamera = () => {
    if (!cameraPermission?.granted || !microphonePermission?.granted) {
      void askPermissions();
      return;
    }
    setCameraReady(false);
    setCameraError(false);
    setCameraSession((session) => session + 1);
  };
  const startCountdown = async () => {
    if (starting || !cameraPermission?.granted || !cameraReady || cameraError || !microphonePermission?.granted || !cameraOn || !microphoneOn || !connected || !settings.categoryId) return;
    setStarting(true);
    let createdId: string | null = null;
    try {
      const coverUrl = settings.coverUri ? await uploadLiveCover(settings.coverUri) : null;
      const created = await createLive({
        title: settings.title.trim(), categoryId: settings.categoryId, coverUrl,
        description: null,
        privacy: settings.privacy === "followers" ? 1 : settings.privacy === "friends" ? 2 : 0,
        allowComments: settings.allowComments, allowGifts: settings.allowGifts,
      });
      createdId = created.id;
      setLiveId(created.id);
      void getUser().then((user) => setHostUserId(user?.id ?? null)).catch(() => setHostUserId(null));
      setComments([]);
      setPinnedComment(null);
      setTopGifters([]);
      clearGiftEvents();
      deletedCommentIds.current.clear();
      setViewerCount(0);
      setReactionCount(0);
      const access = await getLiveToken(created.id);
      if (access.role !== "broadcaster" || !agoraRef.current) throw new Error("Không thể nhận quyền phát Live.");
      await agoraRef.current.join(access);
      setCountdown(3);
      setPhase("countdown");
    } catch (error) {
      await agoraRef.current?.leave().catch(() => undefined);
      if (createdId) await endLive(createdId).catch(() => undefined);
      setLiveId(null);
      showAppToast({ title: "Không thể bắt đầu Live", message: error instanceof Error ? error.message : "Vui lòng thử lại.", type: "error" });
      if (!createdId) {
        const live = await getActiveLive().catch(() => null);
        if (live) { setActiveLive(live); setPhase("setup"); }
      }
    } finally { setStarting(false); }
  };
  const renewAgoraToken = async () => {
    if (!liveId) return;
    try {
      const access = await getLiveToken(liveId, true);
      await agoraRef.current?.renew(access.token);
    } catch {
      showAppToast({ title: "Kết nối Live sắp hết hạn", message: "Không thể gia hạn token. Kiểm tra Internet và thử lại.", type: "error" });
    }
  };
  const showDemo = () => {
    setDemoMode(true);
    setHostUserId("me");
    setComments(demoHostComments);
    setPinnedComment(null);
    setTopGifters(getHostTopGifters(demoHostComments));
    clearGiftEvents();
    setCountdown(3);
    setElapsed(0);
    setPhase("countdown");
  };
  const finish = async () => {
    try {
      if (liveId && !demoMode) {
        const result = await endLive(liveId);
        setEndedAt(new Date(result.endedAt));
        setSummarySession(await getLive(liveId).catch(() => null));
        await agoraRef.current?.leave().catch(() => undefined);
      } else setEndedAt(new Date());
    } catch {
      showAppToast({ title: "Không thể kết thúc Live", message: "Vui lòng thử lại.", type: "error" });
      return;
    }
    setEndRequested(false);
    setPhase("summary");
  };

  return <SafeAreaView edges={mobileViewport && (phase === "countdown" || phase === "live") ? [] : ["top", "bottom"]} style={styles.root}>
    {phase === "setup" ? <LiveHostSetup settings={settings} onChange={setSettings} onContinue={() => void enterCheck()} onBack={leave} activeLive={activeLive} checkingActive={checkingActive} endingActive={endingActive} onEndActive={() => void endPreviousLive()} /> : null}
    {phase === "check" || phase === "countdown" || phase === "live" ? <LiveHostRoom
      mode={phase}
      settings={settings}
      comments={comments}
      pinnedComment={pinnedComment}
      hostUserId={hostUserId}
      onCommentsChange={setComments}
      onPinComment={setLivePinnedComment}
      giftQueue={giftQueue}
      topGifters={topGifters}
      elapsed={elapsed}
      countdown={countdown}
      demoMode={demoMode}
      viewerCount={demoMode ? 1248 : viewerCount}
      reactionCount={demoMode ? 8400 : reactionCount}
      heartBurstRef={heartBurstRef}
      onSendComment={(text) => realtimeRef.current?.sendComment(text) ?? Promise.reject(new Error("Chưa kết nối trò chuyện Live"))}
      onReportComment={(commentId, reason) => realtimeRef.current?.reportComment(commentId, reason) ?? Promise.reject(new Error("Chưa kết nối Live"))}
      onMuteUser={(userId) => realtimeRef.current?.muteUser(userId) ?? Promise.reject(new Error("Chưa kết nối Live"))}
      onDeleteComment={(commentId) => realtimeRef.current?.deleteComment(commentId) ?? Promise.reject(new Error("Chưa kết nối Live"))}
      cameraGranted={Boolean(cameraPermission?.granted)}
      cameraReady={cameraReady}
      cameraError={cameraError}
      cameraSession={cameraSession}
      agoraAppId={agoraAppId}
      agoraRef={agoraRef}
      onTokenWillExpire={() => void renewAgoraToken()}
      microphoneGranted={Boolean(microphonePermission?.granted)}
      cameraOn={cameraOn}
      microphoneOn={microphoneOn}
      facing={facing}
      connected={connected}
      onRequestPermissions={requestOrRetryCamera}
      onCameraToggle={() => { if (demoMode || cameraPermission?.granted) { setCameraReady(false); setCameraError(false); setCameraOn((value) => !value); } else void askPermissions(); }}
      onMicrophoneToggle={() => demoMode || microphonePermission?.granted ? setMicrophoneOn((value) => !value) : void askPermissions()}
      onFlipCamera={() => { setFacing((value) => value === "front" ? "back" : "front"); }}
      onCameraReady={() => { setCameraReady(true); setCameraError(false); }}
      onCameraError={() => { setCameraReady(false); setCameraError(true); }}
      onBack={() => setPhase("setup")}
      onStart={() => void startCountdown()}
      onCancelCountdown={() => { if (liveId && !demoMode) { void agoraRef.current?.leave(); void endLive(liveId).catch(() => undefined); setLiveId(null); } if (demoMode) { setCameraReady(false); setCameraError(false); setCameraSession((session) => session + 1); } setDemoMode(false); setPhase("check"); }}
      onDemo={showDemo}
      onCloseDemo={() => { setEndRequested(false); setDemoMode(false); setCameraReady(false); setCameraError(false); setCameraSession((session) => session + 1); setElapsed(0); setStartedAt(null); setPhase("check"); }}
      onEndRequest={() => setEndRequested(true)}
    /> : null}
    {phase === "summary" ? <HostSummary settings={settings} duration={elapsed} startedAt={startedAt} endedAt={endedAt} liveId={demoMode ? null : liveId} session={demoMode ? null : summarySession} demoMode={demoMode} onDone={() => router.replace("/(tabs)/live")} /> : null}
    {phase === "live" && endRequested ? <View style={[styles.confirmOverlay, width <= 767 && styles.confirmMobile]}><Pressable accessibilityLabel="Tiếp tục Live" accessibilityRole="button" onPress={() => setEndRequested(false)} style={styles.confirmBackdrop} /><HostPanel style={[styles.confirmCard, width <= 767 && styles.confirmCardMobile]}><View style={styles.confirmIcon}><Ionicons color="#FFFFFF" name="power-outline" size={29} /></View><Text style={styles.confirmTitle}>Kết thúc buổi phát trực tiếp?</Text><Text style={styles.confirmText}>{demoMode ? "Phiên giao diện mẫu sẽ dừng và hiển thị trang tổng kết." : `Hiện có ${viewerCount.toLocaleString("vi-VN")} người đang xem. Mọi người sẽ bị ngắt khỏi buổi Live.`}</Text><HostButton label="Kết thúc Live" onPress={finish} variant="danger" /><HostButton label="Tiếp tục Live" onPress={() => setEndRequested(false)} variant="secondary" /></HostPanel></View> : null}
  </SafeAreaView>;
}

function HostSummary({ settings, duration, startedAt, endedAt, session, liveId, demoMode, onDone }: { settings: HostSettings; duration: number; startedAt: Date | null; endedAt: Date | null; session: LiveSession | null; liveId: string | null; demoMode: boolean; onDone: () => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const started = startedAt?.toLocaleString("vi-VN") ?? "—";
  const ended = endedAt?.toLocaleString("vi-VN") ?? "—";
  return <ScrollView contentContainerStyle={styles.summaryScroll} style={styles.summaryRoot}><View style={styles.summaryContainer}>
    <HostHeading title="Tổng kết buổi Live" onBack={onDone} />
    <HostPanel style={styles.summaryPanel}><View style={styles.successIcon}><Ionicons color="#09221B" name="checkmark" size={28} /></View><Text style={styles.summaryTitle}>Buổi phát đã kết thúc</Text><Text style={styles.summaryLead}>{demoMode ? "Bạn vừa xem thử giao diện chủ phòng. Không có buổi phát hay số liệu thật." : session ? "Số liệu lượt xem được ghi nhận từ máy chủ Live." : "Chưa tải được thống kê từ máy chủ. Không hiển thị số liệu chưa xác thực."}</Text>
      <View style={[styles.summaryDetails, wide && styles.summaryDetailsWide]}><LiveCoverImage source={settings.coverUri} borderRadius={12} style={styles.summaryImage} /><View style={styles.summaryCopy}><Text style={styles.summaryLiveTitle}>{settings.title}</Text><Text style={styles.summaryMeta}>{settings.topic} · {settings.privacy === "public" ? "Công khai" : settings.privacy === "followers" ? "Người theo dõi" : "Chỉ bạn bè"}</Text><Text style={styles.summaryMeta}>Bắt đầu: {started}</Text><Text style={styles.summaryMeta}>Kết thúc: {ended}</Text><Text style={styles.summaryMeta}>Thời lượng: {formatHostDuration(duration)}</Text></View></View>
      {session ? <><Text style={styles.statsHeading}>Thống kê buổi Live</Text><View style={styles.summaryStats}><SummaryStat icon="eye" value={session.totalViews.toLocaleString("vi-VN")} label="Lượt xem" mobile={!wide} /><SummaryStat icon="people" value={session.peakViewerCount.toLocaleString("vi-VN")} label="Cao nhất" mobile={!wide} /><SummaryStat icon="person" value={session.uniqueViewers.toLocaleString("vi-VN")} label="Người xem" mobile={!wide} /></View></> : null}
      {liveId ? <LiveHostGiftIncomeSummary liveId={liveId} /> : null}
      <HostButton label="Về trang Live" onPress={onDone} style={styles.summaryDone} />
    </HostPanel>
  </View></ScrollView>;
}

function SummaryStat({ icon, value, label, mobile }: { icon: React.ComponentProps<typeof Ionicons>["name"]; value: string; label: string; mobile: boolean }) { return <View style={[styles.summaryStat, mobile && styles.summaryStatMobile]}><Ionicons color={hostColors.purple} name={icon} size={20} /><View><Text style={styles.summaryStatValue}>{value}</Text><Text style={styles.summaryStatLabel}>{label}</Text></View></View>; }

const styles = StyleSheet.create({
  root: { backgroundColor: hostColors.background, flex: 1 },
  confirmOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 30 },
  confirmMobile: { justifyContent: "flex-end" },
  confirmBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 7, 13, 0.72)" },
  confirmCard: { alignItems: "center", gap: 14, maxWidth: 410, padding: 20, width: "90%" },
  confirmCardMobile: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxWidth: undefined, width: "100%" },
  confirmIcon: { alignItems: "center", backgroundColor: hostColors.pink, borderRadius: 26, height: 52, justifyContent: "center", width: 52 },
  confirmTitle: { color: hostColors.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  confirmText: { color: hostColors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  summaryRoot: { backgroundColor: hostColors.background, flex: 1 },
  summaryScroll: { flexGrow: 1, padding: 16 },
  summaryContainer: { alignSelf: "center", maxWidth: 900, width: "100%" },
  summaryPanel: { alignItems: "center", marginTop: 16, padding: 18 },
  successIcon: { alignItems: "center", backgroundColor: hostColors.green, borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  summaryTitle: { color: hostColors.text, fontSize: 21, fontWeight: "800", marginTop: 12, textAlign: "center" },
  summaryLead: { color: hostColors.muted, fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: "center" },
  summaryDetails: { alignItems: "center", borderBottomColor: hostColors.border, borderBottomWidth: 1, gap: 14, paddingVertical: 20, width: "100%" },
  summaryDetailsWide: { alignItems: "flex-start", flexDirection: "row" },
  summaryImage: { width: 190 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryLiveTitle: { color: hostColors.text, fontSize: 15, fontWeight: "800" },
  summaryMeta: { color: hostColors.muted, fontSize: 11, lineHeight: 18, marginTop: 3 },
  statsHeading: { alignSelf: "flex-start", color: hostColors.text, fontSize: 15, fontWeight: "800", marginTop: 18 },
  summaryStats: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, width: "100%" },
  summaryStat: { alignItems: "center", backgroundColor: hostColors.surfaceRaised, borderRadius: 10, flexDirection: "row", gap: 8, minHeight: 62, padding: 10, width: "31%" },
  summaryStatMobile: { width: "48%" },
  summaryStatValue: { color: hostColors.text, fontSize: 14, fontWeight: "800" },
  summaryStatLabel: { color: hostColors.muted, fontSize: 10 },
  summaryDone: { alignSelf: "stretch", marginTop: 20 },
});
