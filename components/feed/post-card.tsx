import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ViewableImage } from "@/components/common/viewable-image";
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
          <Ionicons color={colors.white} name={reaction.icon} size={size * 0.62} />
        </View>
      ) : (
        <Text style={[styles.reactionEmoji, { fontSize: size }]}>{reaction.emoji}</Text>
      )}
    </View>
  );
}

type Props = {
  onReact?: (postId: string, reactionType: number) => void;
  onSave?: (postId: string) => void;
  onShare?: (postId: string) => void;
  post: FeedPost;
};

export function PostCard({ onReact, onSave, onShare, post }: Props) {
  const [showReactions, setShowReactions] = useState(false);
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

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image
          accessibilityLabel={`Ảnh đại diện của ${post.author}`}
          source={{ uri: post.avatar }}
          style={styles.avatar}
        />
        <View style={styles.authorBlock}>
          <View style={styles.authorRow}>
            <Text numberOfLines={1} style={styles.author}>
              {post.author}
            </Text>
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
          value={post.comments}
        />
        <PostAction
          icon="paper-plane-outline"
          label="Chia sẻ"
          onPress={() => onShare?.(post.id)}
          value={post.shares}
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
  author: { color: colors.text, flexShrink: 1, fontSize: 16, fontWeight: "700" },
  authorBlock: { flex: 1 },
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
