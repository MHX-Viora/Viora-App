import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ViewableImage } from "@/components/common/viewable-image";
import { deletePost, reportPost } from "@/services/post.service";
import { colors, spacing, typography } from "@/theme";
import type { FeedPost } from "@/types/feed";

const reactions = [
  { color: "#1877F2", icon: "thumbs-up" as const, label: "Like", type: 0 },
  { color: "#F33E58", icon: "heart" as const, label: "Love", type: 1 },
  { emoji: "\u{1F602}", label: "Haha", type: 2 },
  { emoji: "\u{1F62E}", label: "Wow", type: 3 },
  { emoji: "\u{1F622}", label: "Sad", type: 4 },
  { emoji: "\u{1F621}", label: "Angry", type: 5 },
];

const REPORT_REASONS = [
  { description: "Nội dung spam hoặc gây hiểu nhầm", label: "Spam", value: 0 },
  { description: "Nội dung quấy rối hoặc công kích", label: "Quấy rối", value: 1 },
  { description: "Nội dung bạo lực hoặc nguy hiểm", label: "Bạo lực", value: 2 },
  { description: "Nội dung người lớn hoặc phản cảm", label: "Nhạy cảm", value: 3 },
  { description: "Lý do khác", label: "Khác", value: 4 },
];

const getVisibilityInfo = (visibility: number) => {
  if (visibility === 1) {
    return { icon: "people-outline" as const, label: "Theo dõi" };
  }

  if (visibility === 2) {
    return { icon: "lock-closed-outline" as const, label: "Riêng tư" };
  }

  return { icon: "earth-outline" as const, label: "Công khai" };
};

function PostAction({
  active,
  icon,
  label,
  onPress,
  value,
}: {
  active?: boolean;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  value?: number;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
    >
      <Ionicons
        color={active ? colors.primary : colors.textMuted}
        name={icon}
        size={25}
      />
      {value !== undefined && (
        <Text style={[styles.actionText, active && styles.actionTextActive]}>
          {value}
        </Text>
      )}
    </Pressable>
  );
}

function ReactionIcon({
  reaction,
  size = 20,
}: {
  reaction: (typeof reactions)[number];
  size?: number;
}) {
  return (
    <View style={styles.reactionIconFrame}>
      {"icon" in reaction ? (
        <View
          style={[
            styles.socialReactionBadge,
            {
              backgroundColor: reaction.color,
              borderRadius: size / 2,
              height: size,
              width: size,
            },
          ]}
        >
          <Ionicons
            color={colors.white}
            name={reaction.icon}
            size={size * 0.62}
          />
        </View>
      ) : (
        <Text style={[styles.reactionEmoji, { fontSize: size }]}>
          {reaction.emoji}
        </Text>
      )}
    </View>
  );
}

type Props = {
  onComment?: (postId: string) => void;
  onDeleted?: (postId: string) => void;
  onOpenAuthor?: (userId: string) => void;
  onReact?: (postId: string, reactionType: number) => void;
  onSave?: (postId: string) => void;
  onShare?: (postId: string) => void;
  post: FeedPost;
};

export function PostCard({
  onComment,
  onDeleted,
  onOpenAuthor,
  onReact,
  onSave,
  onShare,
  post,
}: Props) {
  const [showReactions, setShowReactions] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportingReason, setReportingReason] = useState<number | null>(null);
  const [pressedReactionType, setPressedReactionType] = useState<number | null>(
    null,
  );
  const reactionAnimation = useRef(new Animated.Value(0)).current;
  const visibility = getVisibilityInfo(post.visibility);
  const currentReaction = reactions.find(
    (reaction) => reaction.type === post.reactionType,
  );

  useEffect(() => {
    Animated.spring(reactionAnimation, {
      friction: 7,
      tension: 120,
      toValue: showReactions ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [reactionAnimation, showReactions]);

  const closeReactions = () => {
    Animated.timing(reactionAnimation, {
      duration: 110,
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setPressedReactionType(null);
      setShowReactions(false);
    });
  };

  const chooseReaction = (reactionType: number) => {
    Animated.timing(reactionAnimation, {
      duration: 110,
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setPressedReactionType(null);
      setShowReactions(false);
      onReact?.(post.id, reactionType);
    });
  };

  const activeReaction = post.isReacted ? currentReaction : undefined;

  const openReport = () => {
    setOptionsVisible(false);
    setReportVisible(true);
  };

  const deletePostItem = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await deletePost(post.id);
      setOptionsVisible(false);
      onDeleted?.(post.id);
    } catch (error) {
      Alert.alert(
        "Không thể xóa bài viết",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    if (isDeleting) return;

    Alert.alert(
      "Xóa bài viết?",
      "Bài viết này sẽ bị xóa khỏi Viora. Bạn có chắc muốn tiếp tục không?",
      [
        { style: "cancel", text: "Hủy" },
        {
          onPress: deletePostItem,
          style: "destructive",
          text: "Xóa",
        },
      ],
    );
  };

  const handleReport = async (reason: (typeof REPORT_REASONS)[number]) => {
    if (reportingReason !== null) return;

    setReportingReason(reason.value);
    try {
      await reportPost({
        description: reason.description,
        postId: post.id,
        reason: reason.value,
      });
      setReportVisible(false);
      Alert.alert("Đã gửi báo cáo", "Cảm ơn bạn đã giúp Viora an toàn hơn.");
    } catch (error) {
      Alert.alert(
        "Không thể báo cáo",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setReportingReason(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          disabled={!post.authorId || !onOpenAuthor}
          onPress={() => post.authorId && onOpenAuthor?.(post.authorId)}
        >
        <Image
          accessibilityLabel={`Ảnh đại diện của ${post.author}`}
          source={{ uri: post.avatar }}
          style={styles.avatar}
        />
        </Pressable>
        <View style={styles.authorBlock}>
          <View style={styles.authorRow}>
            <Pressable
              accessibilityRole="button"
              disabled={!post.authorId || !onOpenAuthor}
              onPress={() => post.authorId && onOpenAuthor?.(post.authorId)}
              style={styles.authorPressable}
            >
            <Text numberOfLines={1} style={styles.author}>
              {post.author}
            </Text>
            </Pressable>
            {post.isAuthorVerified && (
              <Ionicons
                accessibilityLabel="Tài khoản đã xác minh"
                color={colors.primary}
                name="checkmark-circle"
                size={16}
              />
            )}
            <View style={styles.visibility}>
              <Ionicons
                color={colors.textMuted}
                name={visibility.icon}
                size={13}
              />
              <Text style={styles.visibilityText}>{visibility.label}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {post.location
              ? `${post.publishedAt} · ${post.location}`
              : post.publishedAt}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Tùy chọn bài viết"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setOptionsVisible(true)}
        >
          <Ionicons
            color={colors.textMuted}
            name="ellipsis-horizontal"
            size={20}
          />
        </Pressable>
      </View>

      <Text style={styles.body}>{post.body}</Text>

      {post.images.length > 0 && (
        <View style={styles.mediaGrid}>
          {post.images.map((uri, index) => (
            <ViewableImage
              accessibilityLabel={`Ảnh ${index + 1} trong bài viết của ${post.author}`}
              key={`${post.id}-${index}`}
              source={{ uri }}
              style={[
                styles.media,
                post.images.length === 1 && styles.singleMedia,
              ]}
            />
          ))}
        </View>
      )}

      {showReactions && (
        <Pressable
          accessibilityLabel="Đóng chọn cảm xúc"
          accessibilityRole="button"
          onPress={closeReactions}
          style={styles.reactionBackdrop}
        />
      )}

      {showReactions && (
        <Animated.View
          style={[
            styles.reactionPicker,
            {
              opacity: reactionAnimation,
              transform: [
                {
                  translateY: reactionAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
                {
                  scale: reactionAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.86, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {reactions.map((reaction) => {
            const isPressed = pressedReactionType === reaction.type;

            return (
              <Pressable
                accessibilityLabel={reaction.label}
                accessibilityRole="button"
                key={reaction.type}
                onPressIn={() => setPressedReactionType(reaction.type)}
                onPressOut={() => setPressedReactionType(null)}
                onPress={() => chooseReaction(reaction.type)}
                style={[
                  styles.reactionButton,
                  isPressed && styles.reactionButtonPressed,
                ]}
              >
                <ReactionIcon reaction={reaction} size={24} />
              </Pressable>
            );
          })}
        </Animated.View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={post.isReacted ? currentReaction?.label : "Like"}
          accessibilityRole="button"
          onLongPress={() => {
            setShowReactions(true);
          }}
          onPress={() => onReact?.(post.id, 0)}
          style={styles.action}
        >
          {activeReaction ? (
            <ReactionIcon reaction={activeReaction} size={23} />
          ) : (
            <Ionicons
              color={colors.textMuted}
              name="thumbs-up-outline"
              size={25}
            />
          )}
          <Text
            style={[
              styles.actionText,
              post.isReacted && styles.actionTextActive,
            ]}
          >
            {post.reactions}
          </Text>
        </Pressable>
        <PostAction
          icon="chatbubble-outline"
          label="Bình luận"
          onPress={() => onComment?.(post.id)}
          value={post.comments}
        />
        <PostAction
          icon="paper-plane-outline"
          label="Chia sẻ"
          onPress={() => onShare?.(post.id)}
          // value={post.shares}
        />
        <View style={styles.spacer} />
        <PostAction
          active={post.isSaved}
          icon={post.isSaved ? "bookmark" : "bookmark-outline"}
          label="Lưu"
          onPress={() => onSave?.(post.id)}
          value={post.saveCount}
        />
      </View>
      <Modal
        animationType="slide"
        onRequestClose={() => setOptionsVisible(false)}
        transparent
        visible={optionsVisible}
      >
        <Pressable
          onPress={() => setOptionsVisible(false)}
          style={styles.sheetBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.sheet}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Tùy chọn bài viết</Text>
            <Pressable onPress={openReport} style={styles.sheetAction}>
              <Ionicons color={colors.text} name="flag-outline" size={22} />
              <Text style={styles.sheetActionText}>Báo cáo bài viết</Text>
            </Pressable>
            {post.isMine && (
              <Pressable
                disabled={isDeleting}
                onPress={handleDelete}
                style={styles.sheetAction}
              >
                {isDeleting ? (
                  <ActivityIndicator color={colors.danger} size="small" />
                ) : (
                  <Ionicons color={colors.danger} name="trash-outline" size={22} />
                )}
                <Text style={[styles.sheetActionText, styles.dangerText]}>
                  Xóa bài viết
                </Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => setReportVisible(false)}
        transparent
        visible={reportVisible}
      >
        <Pressable
          onPress={() => setReportVisible(false)}
          style={styles.sheetBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.sheet}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Báo cáo bài viết</Text>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                disabled={reportingReason !== null}
                key={reason.value}
                onPress={() => handleReport(reason)}
                style={styles.reportReason}
              >
                <View>
                  <Text style={styles.reportTitle}>{reason.label}</Text>
                  <Text style={styles.reportDescription}>
                    {reason.description}
                  </Text>
                </View>
                {reportingReason === reason.value ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Ionicons
                    color={colors.textMuted}
                    name="chevron-forward"
                    size={20}
                  />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 50,
    paddingHorizontal: spacing.sm,
  },
  actionText: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  actionTextActive: { color: colors.primary },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  author: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  authorBlock: { flex: 1 },
  authorPressable: { flexShrink: 1 },
  authorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  avatar: { borderRadius: 20, height: 40, width: 40 },
  body: {
    ...typography.body,
    color: colors.text,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 1,
    marginBottom: spacing.sm,
    position: "relative",
  },
  dangerText: { color: colors.danger },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  media: { backgroundColor: colors.border, height: 180, width: "49.5%" },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    width: "100%",
  },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  reactionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  reactionButton: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    minWidth: 44,
  },
  reactionButtonPressed: {
    backgroundColor: colors.background,
    transform: [{ scale: 1.16 }],
  },
  reactionEmoji: {
    includeFontPadding: false,
    lineHeight: 25,
    textAlign: "center",
    textAlignVertical: "center",
  },
  reactionIconFrame: {
    alignItems: "center",
    height: 25,
    justifyContent: "center",
    width: 25,
  },
  reactionPicker: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    bottom: 48,
    elevation: 8,
    flexDirection: "row",
    gap: spacing.xs,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute",
    zIndex: 3,
  },
  reportDescription: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  reportReason: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingVertical: spacing.sm,
  },
  reportTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginBottom: -1,
    paddingBottom: spacing.xl + 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sheetAction: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 54,
  },
  sheetActionText: { color: colors.text, fontSize: 16, fontWeight: "800" },
  sheetBackdrop: {
    backgroundColor: "rgba(0,0,0,0.38)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    marginBottom: spacing.sm,
    width: 42,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    paddingBottom: spacing.md,
  },
  spacer: { flex: 1 },
  socialReactionBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  singleMedia: { height: 240, width: "100%" },
  visibility: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    minWidth: 72,
  },
  visibilityText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
});
