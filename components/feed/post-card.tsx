import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";
import type { FeedPost } from "@/types/feed";

function PostAction({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value?: number;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      style={styles.action}
    >
      <Ionicons color={colors.textMuted} name={icon} size={20} />
      {value !== undefined && <Text style={styles.actionText}>{value}</Text>}
    </Pressable>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image
          accessibilityLabel={`Ảnh đại diện của ${post.author}`}
          source={{ uri: post.avatar }}
          style={styles.avatar}
        />
        <View style={styles.authorBlock}>
          <Text style={styles.author}>{post.author}</Text>
          <Text style={styles.meta}>
            {post.publishedAt} · {post.location}
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
            <Image
              accessibilityLabel={`Ảnh ${index + 1} trong bài viết của ${post.author}`}
              key={`${post.id}-${index}`}
              source={{ uri: uri }}
              style={[
                styles.media,
                post.images.length === 1 && styles.singleMedia,
              ]}
            />
          ))}
        </View>
      )}
      <View style={styles.actions}>
        <PostAction
          icon="heart-outline"
          label="Thích bài viết"
          value={post.reactions}
        />
        <PostAction
          icon="chatbubble-outline"
          label="Bình luận"
          value={post.comments}
        />
        <PostAction
          icon="paper-plane-outline"
          label="Chia sẻ"
          value={post.shares}
        />
        <View style={styles.spacer} />
        <PostAction icon="bookmark-outline" label="Lưu bài viết" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  actionText: { color: colors.textMuted, fontSize: 14 },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  author: { color: colors.text, fontSize: 16, fontWeight: "700" },
  authorBlock: { flex: 1 },
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
  spacer: { flex: 1 },
  singleMedia: { height: 240, width: "100%" },
});
