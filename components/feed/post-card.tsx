import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { showAppToast } from "@/components/common/app-toast";
import { UserAvatar } from "@/components/common/user-avatar";
import { VerifiedBadge } from "@/components/common/verified-badge";
import { ViewableImage } from "@/components/common/viewable-image";
import { getResponsiveDialogLayout } from "@/components/layout/responsive-layout";
import { MentionText } from "@/components/mentions/mention-text";
import { useResponsive } from "@/hooks/use-responsive";
import { deletePost, reportPost } from "@/services/post.service";
import { spacing, typography } from "@/theme";
import type { FeedPost } from "@/types/feed";
import { normalizePostLink } from "@/utils/post-link";
import { type ThemeColors, useTheme } from "@/theme";


type ReactionItem =
  | { color: string; icon: "heart" | "thumbs-up"; label: string; type: number }
  | { emoji: string; label: string; type: number };

const createReactions = (colors: ThemeColors): ReactionItem[] => [
  { color: colors.visuals.hex_1877F2, icon: "thumbs-up", label: "Like", type: 0 },
  { color: colors.visuals.hex_F33E58, icon: "heart", label: "Love", type: 1 },
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
const BODY_COLLAPSE_LINE_LIMIT = 5;
const BODY_COLLAPSE_CHAR_THRESHOLD = 220;

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
  activeColor,
  activeValueColor,
  icon,
  label,
  onPress,
  value,
}: {
  active?: boolean;
  activeColor?: string;
  activeValueColor?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  value?: number;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedActiveColor = activeColor ?? colors.primary;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
    >
      <Ionicons
        color={active ? resolvedActiveColor : colors.textMuted}
        name={icon}
        size={25}
      />
      {value !== undefined && (
        <Text
          style={[
            styles.actionText,
            active && styles.actionTextActive,
            active && { color: activeValueColor ?? activeColor },
          ]}
        >
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
  reaction: ReactionItem;
  size?: number;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  onOpenPost?: (postId: string) => void;
  onOpenArticle?: (articleId: string) => void;
  onNotInterested?: (postId: string) => void;
  onReact?: (postId: string, reactionType: number) => void;
  onSave?: (postId: string) => void;
  onShare?: (postId: string) => void;
  post: FeedPost;
  variant?: "default" | "news";
};

export function PostCard({
  onComment,
  onDeleted,
  onOpenAuthor,
  onOpenPost,
  onOpenArticle,
  onNotInterested,
  onReact,
  onSave,
  onShare,
  post,
  variant = "default",
}: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isDesktopWeb } = useResponsive();
  const dialogLayout = getResponsiveDialogLayout({
    isDesktopWeb,
    maxWidth: 640,
  });
  const reactions = useMemo(() => createReactions(colors), [colors]);
  const [showReactions, setShowReactions] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportingReason, setReportingReason] = useState<number | null>(null);
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [isBodyExpandable, setIsBodyExpandable] = useState(false);
  const [pressedReactionType, setPressedReactionType] = useState<number | null>(
    null,
  );
  const reactionAnimation = useRef(new Animated.Value(0)).current;
  const visibility = getVisibilityInfo(post.visibility);
  const linkUrl = useMemo(() => normalizePostLink(post.link), [post.link]);
  const currentReaction = reactions.find(
    (reaction) => reaction.type === post.reactionType,
  );
  const bodyLikelyExpandable = useMemo(() => {
    const text = post.body.trim();
    if (!text) return false;
    return (
      text.length > BODY_COLLAPSE_CHAR_THRESHOLD ||
      text.split(/\r\n|\r|\n/).length > BODY_COLLAPSE_LINE_LIMIT
    );
  }, [post.body]);

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
  const isNewsLayout =
    variant === "news" && post.postType === 2 && !!post.article;

  useEffect(() => {
    setIsBodyExpanded(false);
    setIsBodyExpandable(bodyLikelyExpandable);
  }, [bodyLikelyExpandable, post.id, post.body]);

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
      "Bài viết này sẽ bị xóa khỏi ANKT. Bạn có chắc muốn tiếp tục không?",
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
      showAppToast({
        message: "Cảm ơn bạn đã giúp ANKT an toàn hơn.",
        title: "Đã gửi báo cáo",
        type: "success",
      });
    } catch (error) {
      Alert.alert(
        "Không thể báo cáo",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setReportingReason(null);
    }
  };

  const openPostLink = async () => {
    if (!linkUrl) return;
    try {
      await Linking.openURL(linkUrl);
    } catch {
      Alert.alert(
        "KhÃ´ng thá»ƒ má»Ÿ liÃªn káº¿t",
        "LiÃªn káº¿t nÃ y khÃ´ng há»£p lá»‡ hoáº·c khÃ´ng Ä‘Æ°á»£c há»— trá»£.",
      );
    }
  };

  return (
    <Pressable
      accessibilityRole={onOpenPost ? "button" : undefined}
      onPress={onOpenPost ? () => onOpenPost(post.id) : undefined}
      style={[styles.card, isNewsLayout && styles.newsCard]}
    >
      <View style={[styles.header, isNewsLayout && styles.newsHiddenHeader]}>
        <Pressable
          accessibilityRole="button"
          disabled={!post.authorId || !onOpenAuthor}
          onPress={() => post.authorId && onOpenAuthor?.(post.authorId)}
        >
        <UserAvatar
          displayName={post.author}
          imageUrl={post.avatar}
          size={40}
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
              <VerifiedBadge
                accessibilityLabel="Tài khoản đã xác minh"
                size={16}
              />
            )}
          </View>
          <View style={styles.postMetadata}>
            <View style={styles.visibility}>
              <Ionicons
                color={colors.textMuted}
                name={visibility.icon}
                size={13}
              />
              <Text style={styles.visibilityText}>{visibility.label}</Text>
            </View>
            <Text style={styles.meta}>
              {post.location
                ? `${post.publishedAt} · ${post.location}`
                : post.publishedAt}
            </Text>
          </View>
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

      {post.postType === 2 && post.article ? (
        <Pressable
          accessibilityLabel={`Đọc ${post.article.title}`}
          accessibilityRole="button"
          onPress={() => onOpenArticle?.(post.id)}
          style={[styles.articleCard, isNewsLayout && styles.newsArticleCard]}
        >
          {post.article.thumbnailUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: post.article.thumbnailUrl }}
              style={styles.articleThumbnail}
              transition={180}
            />
          ) : null}
          <View
            style={[
              styles.articleContent,
              isNewsLayout && styles.newsArticleContent,
            ]}
          >
            <Text
              numberOfLines={2}
              style={[
                styles.articleTitle,
                isNewsLayout && styles.newsArticleTitle,
              ]}
            >
              {post.article.title}
            </Text>
            {post.article.preview ? (
              <Text
                numberOfLines={2}
                style={[
                  styles.articlePreview,
                  isNewsLayout && styles.newsArticlePreview,
                ]}
              >
                {post.article.preview}
              </Text>
            ) : null}
            {isNewsLayout ? (
              <View style={styles.newsMetaRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!post.authorId || !onOpenAuthor}
                  onPress={(event) => {
                    event.stopPropagation();
                    post.authorId && onOpenAuthor?.(post.authorId);
                  }}
                  style={styles.newsAuthor}
                >
                  <UserAvatar
                    displayName={post.author}
                    imageUrl={post.avatar}
                    size={28}
                    style={styles.newsAuthorAvatar}
                  />
                  <View style={styles.newsAuthorText}>
                    <View style={styles.newsAuthorNameRow}>
                      <Text numberOfLines={1} style={styles.newsAuthorName}>
                        {post.author}
                      </Text>
                      {post.isAuthorVerified ? (
                        <VerifiedBadge
                          accessibilityLabel="Tài khoản đã xác minh"
                          size={14}
                        />
                      ) : null}
                    </View>
                    <Text numberOfLines={2} style={styles.newsPublicationMeta}>
                      {post.publishedAt} · {post.article.readingTimeMinutes} phút
                      đọc · {post.viewCount} lượt đọc
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.newsToolbar}>
                  <Pressable
                    accessibilityLabel="Chia sẻ"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={(event) => {
                      event.stopPropagation();
                      onShare?.(post.id);
                    }}
                    style={styles.newsToolbarButton}
                  >
                    <Ionicons
                      color={colors.textMuted}
                      name="paper-plane-outline"
                      size={22}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Tùy chọn bài viết"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={(event) => {
                      event.stopPropagation();
                      setOptionsVisible(true);
                    }}
                    style={styles.newsToolbarButton}
                  >
                    <Ionicons
                      color={colors.textMuted}
                      name="ellipsis-vertical"
                      size={22}
                    />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.articleMetaRow}>
                <Text style={styles.articleMeta}>
                  {post.article.readingTimeMinutes} phút đọc · {post.viewCount}{" "}
                  lượt xem
                </Text>
                <Text style={styles.readMore}>Đọc tiếp</Text>
              </View>
            )}
          </View>
        </Pressable>
      ) : post.body ? (
        <View style={styles.bodyWrap}>
          <Text
            onTextLayout={(event) => {
              if (event.nativeEvent.lines.length > BODY_COLLAPSE_LINE_LIMIT) {
                setIsBodyExpandable(true);
              }
            }}
            style={[styles.body, styles.bodyMeasure]}
          >
            {post.body}
          </Text>
          <MentionText
            numberOfLines={isBodyExpanded ? undefined : 5}
            mentions={post.mentions}
            style={styles.body}
          >
            {post.body}
          </MentionText>
          {isBodyExpandable ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsBodyExpanded((current) => !current)}
              style={styles.bodyToggle}
            >
              <Text style={styles.bodyToggleText}>
                {isBodyExpanded ? "Ẩn bớt" : "Xem thêm"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {linkUrl ? (
        <Pressable
          accessibilityHint="Má»Ÿ liÃªn káº¿t trong trÃ¬nh duyá»‡t"
          accessibilityLabel={linkUrl}
          accessibilityRole="link"
          onPress={(event) => {
            event.stopPropagation();
            void openPostLink();
          }}
          style={({ pressed }) => [
            styles.linkPressable,
            pressed && styles.linkPressed,
          ]}
        >
          <Text numberOfLines={2} style={styles.linkText}>
            {linkUrl}
          </Text>
        </Pressable>
      ) : null}

      {post.postType !== 2 && post.images.length > 0 && (
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

      {!isNewsLayout ? (
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
        />
        <View style={styles.spacer} />
        <PostAction
          active={post.isSaved}
          activeColor={colors.visuals.hex_F5B400}
          activeValueColor={colors.textMuted}
          icon={post.isSaved ? "bookmark" : "bookmark-outline"}
          label="Lưu"
          onPress={() => onSave?.(post.id)}
          value={post.saveCount}
        />
      </View>
      ) : null}
      <Modal
        animationType={isDesktopWeb ? "fade" : "slide"}
        onRequestClose={() => setOptionsVisible(false)}
        transparent
        visible={optionsVisible}
      >
        <Pressable
          onPress={() => setOptionsVisible(false)}
          style={[styles.sheetBackdrop, dialogLayout.backdrop]}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.sheet, dialogLayout.surface]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Tùy chọn bài viết</Text>
            <Pressable onPress={openReport} style={styles.sheetAction}>
              <Ionicons color={colors.text} name="flag-outline" size={22} />
              <Text style={styles.sheetActionText}>Báo cáo bài viết</Text>
            </Pressable>
            {isNewsLayout && !post.isMine && onNotInterested ? (
              <Pressable
                onPress={() => {
                  setOptionsVisible(false);
                  onNotInterested(post.id);
                }}
                style={styles.sheetAction}
              >
                <Ionicons color={colors.text} name="eye-off-outline" size={22} />
                <Text style={styles.sheetActionText}>Không quan tâm</Text>
              </Pressable>
            ) : null}
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
        animationType={isDesktopWeb ? "fade" : "slide"}
        onRequestClose={() => setReportVisible(false)}
        transparent
        visible={reportVisible}
      >
        <Pressable
          onPress={() => setReportVisible(false)}
          style={[styles.sheetBackdrop, dialogLayout.backdrop]}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.sheet, dialogLayout.surface]}
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
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  articleCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginHorizontal: spacing.md, marginBottom: spacing.sm, overflow: "hidden" },
  articleContent: { gap: 7, padding: spacing.md },
  articleMeta: { color: colors.textMuted, fontSize: 12 },
  articleMetaRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  articlePreview: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  articleThumbnail: { aspectRatio: 16 / 9, backgroundColor: colors.secondaryBackground, width: "100%" },
  articleTitle: { color: colors.text, fontSize: 22, fontWeight: "800", lineHeight: 28 },
  readMore: { color: colors.primary, fontSize: 13, fontWeight: "800" },
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
  },
  bodyMeasure: {
    left: spacing.md,
    opacity: 0,
    position: "absolute",
    right: spacing.md,
    zIndex: -1,
  },
  bodyToggle: {
    alignSelf: "flex-start",
    paddingTop: spacing.xs,
  },
  bodyToggleText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  bodyWrap: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: "hidden",
    position: "relative",
  },
  newsArticleCard: {
    borderRadius: 0,
    borderWidth: 0,
    marginBottom: 0,
    marginHorizontal: 0,
  },
  newsArticleContent: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  newsArticlePreview: {
    fontSize: 14,
    lineHeight: 19,
  },
  newsArticleTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  newsAuthor: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 40,
  },
  newsAuthorAvatar: { borderRadius: 14, height: 28, width: 28 },
  newsAuthorName: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  newsAuthorNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  newsAuthorText: { flex: 1 },
  newsCard: {
    borderRadius: 0,
    borderWidth: 0,
    marginBottom: spacing.sm,
  },
  newsHiddenHeader: { display: "none" },
  newsMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  newsPublicationMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  newsToolbar: { alignItems: "center", flexDirection: "row" },
  newsToolbarButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 36,
  },
  dangerText: { color: colors.danger },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  linkPressable: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
  },
  linkPressed: { opacity: 0.65 },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: "underline",
  },
  media: { backgroundColor: colors.border, height: 180, width: "49.5%" },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    width: "100%",
  },
  meta: { color: colors.textMuted, fontSize: 13 },
  postMetadata: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 2,
  },
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
    backgroundColor: colors.surfaceElevated,
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
    backgroundColor: colors.surfaceElevated,
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
    backgroundColor: colors.visuals.rgb_0_0_0_0_38,
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
