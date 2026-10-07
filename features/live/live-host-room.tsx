import Ionicons from "@expo/vector-icons/Ionicons";
import { type CameraType } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { UserAvatar } from "@/components/common/user-avatar";
import { showAppToast } from "@/components/common/app-toast";
import { liveCommentErrorMessage } from "@/services/live-realtime.service";
import { LiveHeartBurst, type LiveHeartBurstHandle } from "./live-heart-burst";
import { LiveOverlayComment } from "./live-overlay-comment";
import { LiveGiftOverlay } from "./live-gift-overlay";
import type { LiveGiftQueueManager } from "./live-gift-queue-manager";
import { getLiveOverlayCommentLimit, isLiveHostComment, selectLiveOverlayComments } from "./live-overlay-comments";
import { type HostComment, type HostSettings, formatHostDuration } from "./live-host-model";
import { HostAgoraPreview, type HostAgoraPreviewHandle } from "./host-agora-preview";
import { LiveCoverBackdrop } from "./live-cover-backdrop";
import { LiveTopGifters } from "./live-top-gifters";
import type { LiveTopGifter } from "./live-top-gifters-model";
import { isHostMobileViewport } from "./live-host-viewport";
import { HostButton, HostHeading, HostIconButton, HostPanel, hostColors } from "./live-host-ui";

import { DEFAULT_LIVE_COVER as previewImage } from "./live-cover";
const reportReasons = ["Spam", "Bạo lực", "Nội dung người lớn", "Kích động thù ghét", "Tin giả", "Lừa đảo", "Khác"];
const formatLiveCount = (value: number | null | undefined): string =>
  (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0).toLocaleString("vi-VN");

type Props = {
  mode: "check" | "countdown" | "live";
  settings: HostSettings;
  comments: HostComment[];
  pinnedComment: HostComment | null;
  hostUserId: string | null;
  onCommentsChange: (comments: HostComment[]) => void;
  onPinComment: (commentId: string | null) => Promise<void>;
  giftQueue: LiveGiftQueueManager;
  topGifters: readonly LiveTopGifter[];
  elapsed: number;
  countdown: number;
  demoMode: boolean;
  viewerCount: number;
  reactionCount: number;
  heartBurstRef: React.RefObject<LiveHeartBurstHandle | null>;
  onReportComment: (commentId: string, reason: number) => Promise<unknown>;
  onMuteUser: (userId: string) => Promise<unknown>;
  onDeleteComment: (commentId: string) => Promise<unknown>;
  onSendComment: (text: string) => Promise<unknown>;
  cameraGranted: boolean;
  cameraReady: boolean;
  cameraError: boolean;
  cameraSession: number;
  agoraAppId: string;
  agoraRef: React.RefObject<HostAgoraPreviewHandle | null>;
  onTokenWillExpire: () => void;
  microphoneGranted: boolean;
  cameraOn: boolean;
  microphoneOn: boolean;
  facing: CameraType;
  connected: boolean;
  onRequestPermissions: () => void;
  onCameraToggle: () => void;
  onMicrophoneToggle: () => void;
  onFlipCamera: () => void;
  onCameraReady: () => void;
  onCameraError: () => void;
  onBack: () => void;
  onStart: () => void;
  onCancelCountdown: () => void;
  onDemo: () => void;
  onCloseDemo: () => void;
  onEndRequest: () => void;
};

export function LiveHostRoom(props: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = isHostMobileViewport(width, height);
  const sideBySide = width >= 1024 || (props.mode === "check" && width >= 900);
  const live = props.mode === "live";
  const mobileFullscreen = mobile && (live || props.mode === "countdown");
  const [draft, setDraft] = useState("");
  const [roomTab, setRoomTab] = useState<"chat" | "supporters">("chat");
  const [selectedComment, setSelectedComment] = useState<HostComment | null>(null);
  const [selectingReportReason, setSelectingReportReason] = useState(false);
  const previousMode = useRef(props.mode);
  const [countdownExiting, setCountdownExiting] = useState(false);
  useEffect(() => {
    if (previousMode.current === "countdown" && props.mode === "live" && mobile) setCountdownExiting(true);
    else if (props.mode !== "live") setCountdownExiting(false);
    previousMode.current = props.mode;
  }, [mobile, props.mode]);
  const showMobileCountdown = mobile && (props.mode === "countdown" || countdownExiting || (previousMode.current === "countdown" && live));
  const compactControls = live || (mobile && props.mode === "check");
  const smallControls = mobile;
  const visibleComments = props.comments.filter((comment) => !comment.hidden);
  const chatComments = visibleComments.filter((comment) => !comment.gift);
  const overlayComments = selectLiveOverlayComments(chatComments, props.pinnedComment, getLiveOverlayCommentLimit(width, height));
  const ready = props.cameraGranted && props.cameraReady && !props.cameraError && props.microphoneGranted && props.cameraOn && props.microphoneOn && props.connected;
  const sendComment = () => {
    const text = draft.trim();
    if (!text || !props.settings.allowComments) return;
    if (props.demoMode) {
      props.onCommentsChange([...props.comments, { id: `mine-${Date.now()}`, userId: "me", name: "Bạn", text, time: "Vừa xong" }]);
      setDraft("");
    } else void props.onSendComment(text).then(() => setDraft("")).catch((error) => showAppToast({ title: "Không gửi được bình luận", message: liveCommentErrorMessage(error), type: "error" }));
  };
  const openModeration = (comment: HostComment) => { setSelectedComment(comment); setSelectingReportReason(false); };
  const closeModeration = () => { setSelectedComment(null); setSelectingReportReason(false); };
  const reportSelected = (reason: number) => {
    if (!selectedComment) return;
    if (props.demoMode) showAppToast({ title: "Bản xem trước", message: "Báo cáo chỉ được gửi trong Live thật." });
    else void props.onReportComment(selectedComment.id, reason).then(() => showAppToast({ title: "Đã báo cáo", message: "Bình luận đã được gửi để xem xét.", type: "success" })).catch(() => showAppToast({ title: "Không thể báo cáo", message: "Vui lòng thử lại.", type: "error" }));
    closeModeration();
  };
  const muteSelected = () => {
    if (!selectedComment) return;
    if (props.demoMode) props.onCommentsChange(props.comments.map((comment) => comment.userId === selectedComment.userId ? { ...comment, hidden: true } : comment));
    else void props.onMuteUser(selectedComment.userId).then(() => showAppToast({ title: "Đã tắt quyền bình luận", message: `${selectedComment.name} không thể bình luận trong Live này.`, type: "success" })).catch(() => showAppToast({ title: "Không thể tắt quyền bình luận", message: "Vui lòng thử lại.", type: "error" }));
    closeModeration();
  };
  const deleteSelected = () => {
    if (!selectedComment) return;
    if (props.demoMode) {
      props.onCommentsChange(props.comments.filter((comment) => comment.id !== selectedComment.id));
      if (props.pinnedComment?.id === selectedComment.id) void props.onPinComment(null);
    }
    else void props.onDeleteComment(selectedComment.id).catch(() => showAppToast({ title: "Không thể xóa bình luận", message: "Vui lòng thử lại.", type: "error" }));
    closeModeration();
  };
  const pinSelected = () => {
    if (!selectedComment) return;
    const nextId = props.pinnedComment?.id === selectedComment.id ? null : selectedComment.id;
    void props.onPinComment(nextId).catch(() => showAppToast({ title: "Không thể ghim bình luận", message: "Vui lòng thử lại.", type: "error" }));
    closeModeration();
  };

  const controls = <View style={[styles.controls, mobile && styles.mobileControls, props.mode === "check" && mobile && styles.mobileCheckControls, live && !mobile && styles.desktopControls]}>
    <HostIconButton compact={compactControls} small={smallControls} icon={(props.demoMode || props.microphoneGranted) && props.microphoneOn ? "mic-outline" : "mic-off-outline"} label={(props.demoMode || props.microphoneGranted) && props.microphoneOn ? "Tắt mic" : "Bật mic"} onPress={props.onMicrophoneToggle} />
    <HostIconButton compact={compactControls} small={smallControls} icon={(props.demoMode || props.cameraGranted) && props.cameraOn ? "videocam-outline" : "videocam-off-outline"} label={(props.demoMode || props.cameraGranted) && props.cameraOn ? "Tắt camera" : "Bật camera"} onPress={props.onCameraToggle} />
    <HostIconButton compact={compactControls} small={smallControls} icon="camera-reverse-outline" label="Đổi camera" onPress={props.onFlipCamera} />
    {live ? <HostIconButton compact={compactControls} small={smallControls} danger icon="power-outline" label="Kết thúc" onPress={props.onEndRequest} /> : null}
  </View>;

  const media = <View style={[styles.stage, mobileFullscreen ? styles.mobileStage : width >= 768 ? styles.wideStage : styles.portraitStage]}>
    {props.demoMode ? props.cameraOn ? <LiveCoverBackdrop source={previewImage} /> : null : props.cameraGranted && props.agoraAppId ? <><HostAgoraPreview appId={props.agoraAppId} cameraOn={props.cameraOn} facing={props.facing} key={props.cameraSession} microphoneOn={props.microphoneOn} onError={props.onCameraError} onReady={props.onCameraReady} onTokenWillExpire={props.onTokenWillExpire} ref={props.agoraRef} style={StyleSheet.absoluteFillObject} />{!props.cameraOn || !props.cameraReady ? <LiveCoverBackdrop source={props.settings.coverUri ? { uri: props.settings.coverUri } : previewImage} /> : null}</> : <LiveCoverBackdrop source={props.settings.coverUri ? { uri: props.settings.coverUri } : previewImage} />}
    <View style={styles.stageShade} />
    {live ? <View pointerEvents="none" style={[styles.reactionHearts, mobile && styles.mobileReactionHearts]}><LiveHeartBurst ref={props.heartBurstRef} /></View> : null}
    {!props.cameraOn || (!props.demoMode && (!props.cameraGranted || props.cameraError)) ? <View style={styles.cameraMessage}><Ionicons color={hostColors.text} name="videocam-off-outline" size={36} /><Text style={styles.cameraMessageText}>{!props.cameraOn ? "Camera đang tắt" : props.cameraError ? "Không thể mở camera" : "Cần cấp quyền camera để xem trước"}</Text></View> : null}

    {live ? <View style={[styles.liveTop, mobile && { top: insets.top + 10 }]}><View style={[styles.liveTopLeft, mobile && styles.mobileLiveTopLeft]}><View style={[styles.livePill, mobile && styles.mobileLivePill]}><Ionicons color="#FFFFFF" name="radio" size={mobile ? 10 : 12} /><Text style={[styles.livePillText, mobile && styles.mobileLivePillText]}>{props.demoMode ? "LIVE · DEMO" : "LIVE"}</Text></View><StatPill compact={mobile} icon="time-outline" value={formatHostDuration(props.elapsed)} /><StatPill compact={mobile} icon="eye-outline" value={formatLiveCount(props.viewerCount)} /><StatPill compact={mobile} icon="heart" value={formatLiveCount(props.reactionCount)} /></View>{props.demoMode ? <Pressable accessibilityLabel="Thoát giao diện mẫu" accessibilityRole="button" onPress={props.onCloseDemo} style={styles.closeButton}><Ionicons color="#FFFFFF" name="close" size={21} /></Pressable> : <View style={[styles.connectionBadge, mobile && styles.mobileConnectionBadge]}><Ionicons color={props.connected ? hostColors.green : hostColors.yellow} name={props.connected ? "checkmark-circle" : "warning-outline"} size={14} /><Text style={styles.connectionText}>{props.connected ? "Thiết bị sẵn sàng" : "Mất kết nối mạng"}</Text></View>}</View> : props.mode === "countdown" && mobile ? null : <View style={styles.previewBadge}><Text style={styles.previewBadgeText}>{props.mode === "check" ? "PREVIEW · CHƯA PHÁT LIVE" : "CHUẨN BỊ"}</Text></View>}
    {live && mobile ? <View style={[styles.mobileGifters, { top: insets.top + 40 }]}><LiveTopGifters gifters={props.topGifters} mode="mobile" /></View> : null}

    {live ? <LiveGiftOverlay compact={mobile} manager={props.giftQueue} /> : null}
    {props.mode === "check" && !mobile ? <View style={styles.previewControls}>{controls}</View> : null}
    {live && !mobile ? <View style={styles.liveControls}>{controls}</View> : null}
    {props.mode === "countdown" && !mobile ? <View style={styles.countdownOverlay}><View style={styles.countdownRing}><Text style={styles.countdownNumber}>{props.countdown}</Text></View><Text style={styles.countdownTitle}>Chuẩn bị bắt đầu phát trực tiếp</Text><Text style={styles.countdownNote}>Giao diện xem trước · Chưa phát đến người xem</Text><HostButton label="Hủy" onPress={props.onCancelCountdown} variant="secondary" style={styles.cancelCountdown} /></View> : null}
    {showMobileCountdown ? <MobileCountdownOverlay active={props.mode === "countdown"} countdown={props.countdown} onCancel={props.onCancelCountdown} onHidden={() => setCountdownExiting(false)} topInset={insets.top} bottomInset={insets.bottom} /> : null}
    {mobile && live ? <View style={[styles.mobileComments, { bottom: insets.bottom + 126 }]}>{props.settings.allowComments ? <>{overlayComments.pinned ? <LiveOverlayComment avatarUrl={overlayComments.pinned.avatarUrl} isHost={isLiveHostComment(overlayComments.pinned.userId, props.hostUserId)} isPinned key={`pinned-${overlayComments.pinned.id}`} name={overlayComments.pinned.name} onPress={() => openModeration(overlayComments.pinned!)} text={overlayComments.pinned.text} /> : null}{overlayComments.recent.map((comment) => {
      const isHost = isLiveHostComment(comment.userId, props.hostUserId);
      return <LiveOverlayComment avatarUrl={comment.avatarUrl} isHost={isHost} key={comment.id} name={comment.name} onPress={() => openModeration(comment)} text={comment.text} />;
    })}</> : <Text style={styles.muted}>Bình luận đang tắt</Text>}</View> : null}
    {mobile && live ? <View style={[styles.mobileBottom, { bottom: insets.bottom + 8 }]}><View style={styles.mobileCompose}><TextInput accessibilityLabel="Bình luận với tư cách chủ Live" editable={props.settings.allowComments} onChangeText={setDraft} onSubmitEditing={sendComment} placeholder="Nhập bình luận..." placeholderTextColor={hostColors.muted} style={styles.chatInput} value={draft} /><Pressable accessibilityLabel="Gửi bình luận" accessibilityRole="button" disabled={!draft.trim()} onPress={sendComment} style={styles.send}><Ionicons color={draft.trim() ? hostColors.cyan : hostColors.muted} name="send" size={20} /></Pressable></View>{controls}</View> : null}
  </View>;

  return <><ScrollView contentContainerStyle={[styles.scrollContent, mobileFullscreen && styles.mobileScrollContent, mobileFullscreen && { minHeight: height }]} scrollEnabled={!mobileFullscreen} style={styles.root}>
    <View style={[styles.container, mobileFullscreen && styles.mobileContainer]}>
      {props.mode === "check" ? <HostHeading title="Kiểm tra thiết bị" subtitle="Đảm bảo mọi thứ sẵn sàng trước khi Live" onBack={props.onBack} /> : null}
      <View style={[styles.layout, sideBySide && styles.layoutSideBySide, mobileFullscreen && styles.mobileLayout]}>
        <View style={styles.mediaColumn}>
          {media}
          {props.mode === "check" && mobile ? controls : null}
        </View>
        {props.mode === "check" ? <HostPanel style={[styles.statusPanel, sideBySide && { width: Math.min(350, width * 0.28) }]}>
          <Text style={styles.panelTitle}>Trạng thái thiết bị</Text>
          <StatusRow icon="videocam-outline" label="Camera" ok={props.cameraGranted && props.cameraOn && props.cameraReady && !props.cameraError} detail={!props.cameraGranted ? "Chưa cấp quyền" : !props.cameraOn ? "Đang tắt" : props.cameraError ? "Không có hình ảnh" : props.cameraReady ? "Hoạt động tốt" : "Đang kiểm tra hình ảnh"} />
          <StatusRow icon="mic-outline" label="Microphone" ok={props.microphoneGranted && props.microphoneOn} detail={props.microphoneGranted ? props.microphoneOn ? "Đã cấp quyền" : "Đang tắt" : "Chưa cấp quyền"} />
          <StatusRow icon="wifi-outline" label="Kết nối Internet" ok={props.connected} detail={props.connected ? "Có kết nối · chưa đo tốc độ" : "Mất kết nối"} />
          <StatusRow icon="shield-checkmark-outline" label="Thiết bị" ok={ready} detail={ready ? "Sẵn sàng xem trước" : "Cần kiểm tra"} />
          {(!props.cameraGranted || !props.microphoneGranted || props.cameraError) ? <HostButton label={!props.cameraGranted || !props.microphoneGranted ? "Cho phép camera và micro" : "Thử lại camera"} icon={props.cameraError ? "refresh-outline" : "lock-open-outline"} onPress={props.onRequestPermissions} variant="secondary" style={styles.statusButton} /> : null}
          <HostButton disabled={!ready} label="Bắt đầu live" icon="radio-outline" onPress={props.onStart} style={styles.statusButton} />
          <HostButton label="Xem giao diện chủ phòng mẫu" onPress={props.onDemo} variant="secondary" style={styles.statusButton} />
          <Text style={styles.statusHint}>Chỉ nút “Xem giao diện chủ phòng mẫu” dùng dữ liệu minh họa.</Text>
        </HostPanel> : null}
        {live && !mobile ? <HostPanel style={[styles.chatPanel, sideBySide && { width: Math.min(390, width * 0.28) }]}>
          <View style={styles.roomTabs}>
            {([ ["chat", "Trò chuyện"], ["supporters", "Top người tặng"] ] as const).map(([id, label]) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: roomTab === id }} key={id} onPress={() => setRoomTab(id)} style={[styles.roomTab, roomTab === id && styles.roomTabActive]}><Text style={[styles.roomTabText, roomTab === id && styles.roomTabTextActive]}>{label}</Text></Pressable>)}
          </View>
          {roomTab === "chat" && props.settings.allowComments && props.pinnedComment ? <View style={styles.pinnedSidebar}><LiveOverlayComment avatarUrl={props.pinnedComment.avatarUrl} isHost={isLiveHostComment(props.pinnedComment.userId, props.hostUserId)} isPinned name={props.pinnedComment.name} onPress={() => openModeration(props.pinnedComment!)} text={props.pinnedComment.text} /></View> : null}
          {roomTab === "chat" ? <ScrollView contentContainerStyle={styles.chatList} style={styles.chatScroll}>{props.settings.allowComments ? chatComments.filter((comment) => comment.id !== props.pinnedComment?.id).map((comment) => <HostChatLine comment={comment} isHost={isLiveHostComment(comment.userId, props.hostUserId)} key={comment.id} onFlag={openModeration} />) : <Text style={styles.muted}>Bình luận đang tắt</Text>}</ScrollView> : <LiveTopGifters gifters={props.topGifters} mode="sidebar" />}
          <View style={styles.chatComposer}><TextInput accessibilityLabel="Bình luận với tư cách chủ Live" editable={props.settings.allowComments} onChangeText={setDraft} onSubmitEditing={sendComment} placeholder={props.settings.allowComments ? "Nhập bình luận..." : "Bình luận đang tắt"} placeholderTextColor={hostColors.muted} style={styles.chatInput} value={draft} /><Pressable accessibilityLabel="Gửi bình luận" accessibilityRole="button" disabled={!draft.trim()} onPress={sendComment} style={styles.send}><Ionicons color={draft.trim() ? hostColors.cyan : hostColors.muted} name="send" size={20} /></Pressable></View>
        </HostPanel> : null}
      </View>
      {live && !props.connected ? <Text style={styles.networkWarning}>Kết nối không ổn định – đang thử kết nối lại…</Text> : null}
    </View>
  </ScrollView>
    <Modal animationType="fade" onRequestClose={closeModeration} transparent visible={selectedComment !== null}>
      <View style={styles.moderationOverlay}>
        <Pressable accessibilityLabel="Đóng thao tác bình luận" accessibilityRole="button" onPress={closeModeration} style={StyleSheet.absoluteFillObject} />
        <View style={styles.moderationCard}>
          <Text style={styles.moderationTitle}>{selectingReportReason ? "Lý do báo cáo" : "Quản lý bình luận"}</Text>
          <Text numberOfLines={2} style={styles.moderationPreview}>{selectedComment?.name} · {selectedComment?.text}</Text>
          {selectingReportReason ? reportReasons.map((reason, index) => <Pressable accessibilityRole="button" key={reason} onPress={() => reportSelected(index)} style={styles.moderationAction}><Text style={styles.moderationActionText}>{reason}</Text></Pressable>) : <>
            <Pressable accessibilityRole="button" onPress={pinSelected} style={styles.moderationAction}><Ionicons color={hostColors.yellow} name="pin-outline" size={18} /><Text style={styles.moderationActionText}>{props.pinnedComment?.id === selectedComment?.id ? "Bỏ ghim bình luận" : "Ghim bình luận"}</Text></Pressable>
            {!isLiveHostComment(selectedComment?.userId, props.hostUserId) ? <>
            <Pressable accessibilityRole="button" onPress={() => setSelectingReportReason(true)} style={styles.moderationAction}><Ionicons color={hostColors.text} name="flag-outline" size={18} /><Text style={styles.moderationActionText}>Báo cáo bình luận</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={muteSelected} style={styles.moderationAction}><Ionicons color={hostColors.yellow} name="volume-mute-outline" size={18} /><Text style={styles.moderationActionText}>Tắt quyền bình luận người này</Text></Pressable>
            </> : null}
            <Pressable accessibilityRole="button" onPress={deleteSelected} style={styles.moderationAction}><Ionicons color={hostColors.pink} name="trash-outline" size={18} /><Text style={styles.moderationActionText}>Xóa bình luận</Text></Pressable>
          </>}
          <Pressable accessibilityRole="button" onPress={closeModeration} style={styles.moderationCancel}><Text style={styles.moderationCancelText}>Hủy</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}

function MobileCountdownOverlay({ active, countdown, onCancel, onHidden, topInset, bottomInset }: {
  active: boolean;
  countdown: number;
  onCancel: () => void;
  onHidden: () => void;
  topInset: number;
  bottomInset: number;
}) {
  const { height } = useWindowDimensions();
  const size = Math.min(144, Math.max(88, height * 0.22));
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const [progress, setProgress] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const numberProgress = useRef(new Animated.Value(0)).current;
  const onHiddenRef = useRef(onHidden);
  onHiddenRef.current = onHidden;

  useEffect(() => {
    if (!active) {
      const fade = Animated.timing(opacity, { duration: 280, easing: Easing.out(Easing.ease), toValue: 0, useNativeDriver: true });
      fade.start(({ finished }) => { if (finished) onHiddenRef.current(); });
      return () => fade.stop();
    }
    opacity.setValue(1);
    numberProgress.setValue(0);
    setProgress(0);
    const numberAnimation = Animated.timing(numberProgress, { duration: 240, easing: Easing.out(Easing.ease), toValue: 1, useNativeDriver: true });
    numberAnimation.start();
    const startedAt = Date.now();
    let frame = 0;
    const tick = () => {
      const next = Math.min(1, (Date.now() - startedAt) / 1000);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); numberAnimation.stop(); };
  }, [active, countdown, numberProgress, opacity]);

  return <Animated.View pointerEvents={active ? "auto" : "none"} style={[styles.mobileCountdownOverlay, { opacity }]}>
    <View style={[styles.mobileCountdownBadge, { top: topInset + 18 }]}><View style={styles.mobileCountdownDot} /><Text style={styles.mobileCountdownBadgeText}>CHUẨN BỊ LIVE</Text></View>
    <View style={styles.mobileCountdownCenter}>
      <View style={[styles.mobileCountdownRing, { height: size, width: size }]}>
        <Svg height={size} width={size}>
          <Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="rgba(255,255,255,0.22)" strokeWidth={6} />
          <Circle cx={size / 2} cy={size / 2} fill="none" originX={size / 2} originY={size / 2} r={radius} rotation={-90} stroke={hostColors.purple} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * progress} strokeLinecap="round" strokeWidth={6} />
        </Svg>
        <Animated.Text style={[styles.mobileCountdownNumber, { fontSize: height < 500 ? 56 : 72, opacity: numberProgress, transform: [{ scale: numberProgress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>{countdown}</Animated.Text>
      </View>
      <Text style={[styles.mobileCountdownTitle, height < 500 && styles.mobileCountdownTitleLandscape]}>Chuẩn bị bắt đầu phát trực tiếp</Text>
      <Text style={styles.mobileCountdownNote}>Buổi Live sẽ bắt đầu sau vài giây</Text>
    </View>
    <Pressable accessibilityLabel="Hủy bắt đầu Live" accessibilityRole="button" onPress={onCancel} style={[styles.mobileCountdownCancel, { bottom: bottomInset + 24 }]}><Text style={styles.mobileCountdownCancelText}>Hủy</Text></Pressable>
  </Animated.View>;
}

function StatPill({ icon, value, compact = false }: { icon: React.ComponentProps<typeof Ionicons>["name"]; value: string; compact?: boolean }) { return <View style={[styles.statPill, compact && styles.mobileStatPill]}><Ionicons color={hostColors.text} name={icon} size={compact ? 11 : 13} /><Text style={[styles.statPillText, compact && styles.mobileStatPillText]}>{value}</Text></View>; }
function HostChatLine({ comment, isHost, onFlag }: { comment: HostComment; isHost: boolean; onFlag: (comment: HostComment) => void }) {
  if (isHost) return <View style={styles.hostSidebarComment}><LiveOverlayComment avatarUrl={comment.avatarUrl} isHost name={comment.name} onPress={() => onFlag(comment)} text={comment.text} /></View>;
  return <View style={styles.chatRow}>
    <UserAvatar displayName={comment.name} imageUrl={comment.avatarUrl} size={23} />
    <View style={styles.chatCopy}><Text numberOfLines={3} style={styles.chatText}><Text style={styles.chatName}>{comment.name}</Text>{" · "}{comment.text}</Text>{comment.pinned ? <Text style={styles.pinned}>📌 Đã ghim</Text> : null}</View>
    {comment.userId !== "me" ? <Pressable accessibilityLabel={`Quản lý bình luận của ${comment.name}`} accessibilityRole="button" onPress={() => onFlag(comment)} style={styles.commentFlag}><Ionicons color="#DAE5F1" name="flag-outline" size={16} /></Pressable> : null}
  </View>;
}
function StatusRow({ icon, label, ok, detail }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; ok: boolean; detail: string }) { return <View style={styles.statusRow}><Ionicons color={ok ? hostColors.green : hostColors.yellow} name={icon} size={18} /><Text style={styles.statusName}>{label}</Text><Text style={[styles.statusValue, { color: ok ? hostColors.green : hostColors.yellow }]}>{detail}</Text></View>; }

const styles = StyleSheet.create({
  root: { backgroundColor: hostColors.background, flex: 1 },
  scrollContent: { flexGrow: 1, padding: 16 },
  container: { alignSelf: "center", maxWidth: 1600, width: "100%" },
  layout: { gap: 14, marginTop: 14 },
  layoutSideBySide: { flexDirection: "row" },
  mediaColumn: { flex: 1, minWidth: 0 },
  stage: { backgroundColor: hostColors.surface, borderColor: hostColors.border, borderRadius: 16, borderWidth: 1, overflow: "hidden", position: "relative", width: "100%" },
  reactionHearts: { bottom: 80, height: 45, position: "absolute", right: 44, width: 45, zIndex: 4 },
  mobileReactionHearts: { bottom: 130, right: 26 },
  wideStage: { aspectRatio: 16 / 9 },
  portraitStage: { aspectRatio: 4 / 3 },
  mobileScrollContent: { padding: 0 },
  mobileContainer: { flex: 1 },
  mobileLayout: { flex: 1, marginTop: 0 },
  mobileStage: { borderRadius: 0, borderWidth: 0, flex: 1 },
  stageShade: { backgroundColor: "rgba(2, 7, 13, 0.16)", ...StyleSheet.absoluteFillObject },
  cameraMessage: { alignItems: "center", backgroundColor: "rgba(2, 7, 13, 0.56)", gap: 10, justifyContent: "center", ...StyleSheet.absoluteFillObject },
  cameraMessageText: { color: hostColors.text, fontSize: 13, fontWeight: "700", textAlign: "center" },
  previewBadge: { backgroundColor: "rgba(4, 14, 25, 0.82)", borderRadius: 8, left: 12, paddingHorizontal: 10, paddingVertical: 7, position: "absolute", top: 12 },
  previewBadgeText: { color: hostColors.cyan, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  previewControls: { bottom: 14, left: 12, position: "absolute", right: 12 },
  controls: { flexDirection: "row", flexWrap: "nowrap", gap: 7, justifyContent: "center" },
  mobileControls: { gap: 4 },
  mobileCheckControls: { flexWrap: "nowrap", marginTop: 8 },
  desktopControls: { gap: 7 },
  liveControls: { bottom: 12, left: 12, position: "absolute", right: 12, zIndex: 4 },
  statusPanel: { alignSelf: "stretch", gap: 10, padding: 16, width: "100%" },
  panelTitle: { color: hostColors.text, fontSize: 16, fontWeight: "800" },
  statusRow: { alignItems: "center", backgroundColor: hostColors.surfaceRaised, borderRadius: 9, flexDirection: "row", gap: 8, minHeight: 44, paddingHorizontal: 10 },
  statusName: { color: hostColors.text, flex: 1, fontSize: 12, fontWeight: "700" },
  statusValue: { fontSize: 10, fontWeight: "700", textAlign: "right" },
  statusButton: { marginTop: 4 },
  statusHint: { color: hostColors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  countdownOverlay: { alignItems: "center", backgroundColor: "rgba(2, 7, 13, 0.72)", gap: 14, justifyContent: "center", ...StyleSheet.absoluteFillObject },
  countdownRing: { alignItems: "center", borderColor: hostColors.purple, borderRadius: 80, borderWidth: 5, height: 144, justifyContent: "center", width: 144 },
  countdownNumber: { color: hostColors.text, fontSize: 66, fontWeight: "900" },
  countdownTitle: { color: hostColors.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
  countdownNote: { color: hostColors.muted, fontSize: 11, textAlign: "center" },
  cancelCountdown: { minWidth: 140 },
  mobileCountdownOverlay: { alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.32)", justifyContent: "center", ...StyleSheet.absoluteFillObject },
  mobileCountdownBadge: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(9, 17, 30, 0.62)", borderColor: "rgba(255,255,255,0.15)", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 7, paddingHorizontal: 13, paddingVertical: 8, position: "absolute" },
  mobileCountdownDot: { backgroundColor: hostColors.pink, borderRadius: 4, height: 7, width: 7 },
  mobileCountdownBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  mobileCountdownCenter: { alignItems: "center", gap: 14, paddingHorizontal: 20, width: "100%" },
  mobileCountdownRing: { alignItems: "center", justifyContent: "center" },
  mobileCountdownNumber: { color: "#FFFFFF", fontWeight: "900", position: "absolute" },
  mobileCountdownTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", lineHeight: 28, maxWidth: 310, textAlign: "center" },
  mobileCountdownTitleLandscape: { fontSize: 18, lineHeight: 22 },
  mobileCountdownNote: { color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 19, textAlign: "center" },
  mobileCountdownCancel: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(0,0,0,0.48)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 25, borderWidth: 1, height: 50, justifyContent: "center", position: "absolute", width: 140 },
  mobileCountdownCancelText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  muted: { color: hostColors.muted, fontSize: 11, marginTop: 3 },
  liveTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", left: 10, position: "absolute", right: 10, top: 10, zIndex: 4 },
  liveTopLeft: { flexDirection: "row", flexWrap: "wrap", gap: 4, maxWidth: "76%" },
  mobileLiveTopLeft: { flexWrap: "nowrap", maxWidth: "86%" },
  closeButton: { alignItems: "center", backgroundColor: "rgba(8, 17, 29, 0.62)", borderRadius: 18, height: 35, justifyContent: "center", width: 35 },
  mobileGifters: { left: 10, position: "absolute", zIndex: 4 },
  livePill: { alignItems: "center", backgroundColor: hostColors.pink, borderRadius: 7, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  mobileLivePill: { gap: 3, paddingHorizontal: 5, paddingVertical: 5 },
  livePillText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  mobileLivePillText: { fontSize: 9 },
  statPill: { alignItems: "center", backgroundColor: "rgba(3, 10, 18, 0.72)", borderRadius: 7, flexDirection: "row", gap: 4, paddingHorizontal: 7, paddingVertical: 6 },
  mobileStatPill: { gap: 3, paddingHorizontal: 4, paddingVertical: 5 },
  statPillText: { color: hostColors.text, fontSize: 10, fontWeight: "800" },
  mobileStatPillText: { fontSize: 9 },
  connectionBadge: { alignItems: "center", backgroundColor: "rgba(3, 10, 18, 0.72)", borderRadius: 7, flexDirection: "row", gap: 4, paddingHorizontal: 7, paddingVertical: 6 },
  mobileConnectionBadge: { position: "absolute", right: 0, top: 32 },
  connectionText: { color: hostColors.text, fontSize: 9, fontWeight: "700" },
  chatPanel: { borderWidth: 0, minHeight: 380, overflow: "hidden", padding: 0, width: "100%" },
  roomTabs: { alignItems: "center", flexDirection: "row", justifyContent: "space-around", minHeight: 48, paddingHorizontal: 5 },
  roomTab: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  roomTabActive: { backgroundColor: "rgba(247, 67, 105, 0.12)" },
  roomTabText: { color: hostColors.muted, fontSize: 11, fontWeight: "700" },
  roomTabTextActive: { color: hostColors.text },
  chatScroll: { flex: 1, maxHeight: 540, minHeight: 180 },
  chatList: { padding: 10 },
  pinnedSidebar: { padding: 8 },
  hostSidebarComment: { marginVertical: 4 },
  chatRow: { alignItems: "flex-start", flexDirection: "row", gap: 7, paddingVertical: 4 },
  chatCopy: { flex: 1 },
  commentFlag: { alignItems: "center", justifyContent: "center", minHeight: 26, minWidth: 26 },
  moderationOverlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.65)", flex: 1, justifyContent: "center", padding: 20 },
  moderationCard: { backgroundColor: hostColors.surface, borderColor: hostColors.border, borderRadius: 18, borderWidth: 1, gap: 4, maxWidth: 380, padding: 18, width: "100%" },
  moderationTitle: { color: hostColors.text, fontSize: 17, fontWeight: "800", marginBottom: 4 },
  moderationPreview: { color: hostColors.muted, fontSize: 12, lineHeight: 18, marginBottom: 9 },
  moderationAction: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 44, paddingHorizontal: 5 },
  moderationActionText: { color: hostColors.text, fontSize: 13, fontWeight: "700" },
  moderationCancel: { alignItems: "center", marginTop: 5, padding: 9 },
  moderationCancelText: { color: hostColors.muted, fontSize: 13, fontWeight: "700" },
  chatName: { color: hostColors.text, fontSize: 12, fontWeight: "800" },
  chatText: { color: "#DAE5F1", fontSize: 12, lineHeight: 17 },
  pinned: { color: hostColors.pink, fontSize: 10, marginTop: 3 },
  chatComposer: { alignItems: "center", flexDirection: "row", padding: 8 },
  chatInput: { color: hostColors.text, flex: 1, fontSize: 12, minHeight: 40, paddingHorizontal: 10 },
  send: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  mobileComments: { gap: 4, left: 8, maxWidth: "82%", position: "absolute", right: 8, zIndex: 4 },
  mobileBottom: { left: 8, position: "absolute", right: 8, zIndex: 4 },
  mobileCompose: { alignItems: "center", backgroundColor: "rgba(4, 14, 25, 0.88)", borderRadius: 22, flexDirection: "row", marginBottom: 8 },
  networkWarning: { color: hostColors.yellow, fontSize: 12, marginTop: 10, textAlign: "center" },
});
