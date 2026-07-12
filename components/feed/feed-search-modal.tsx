import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostCard } from "@/components/feed/post-card";
import { colors, spacing } from "@/theme";
import type { FeedPost } from "@/types/feed";

export function FeedSearchModal({
  onClose,
  posts,
  visible,
}: {
  onClose: () => void;
  posts: readonly FeedPost[];
  visible: boolean;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const results = useMemo(
    () =>
      normalizedQuery
        ? posts.filter((post) =>
            [post.author, post.body, post.location].some((value) =>
              value.toLocaleLowerCase("vi").includes(normalizedQuery),
            ),
          )
        : [],
    [normalizedQuery, posts],
  );

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={close} visible={visible}>
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Đóng tìm kiếm"
            accessibilityRole="button"
            hitSlop={8}
            onPress={close}
            style={styles.iconButton}
          >
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </Pressable>
          <View style={styles.searchBox}>
            <Ionicons color={colors.textMuted} name="search" size={20} />
            <TextInput
              accessibilityLabel="Tìm kiếm bài viết"
              autoFocus
              onChangeText={setQuery}
              placeholder="Tìm bài viết, tác giả..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={styles.input}
              value={query}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityLabel="Xóa nội dung tìm kiếm"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setQuery("")}
              >
                <Ionicons
                  color={colors.textMuted}
                  name="close-circle"
                  size={20}
                />
              </Pressable>
            )}
          </View>
        </View>

        {normalizedQuery ? (
          <FlatList
            contentContainerStyle={results.length === 0 && styles.emptyList}
            data={results}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <EmptySearch
                title="Không tìm thấy bài viết"
                description="Thử tìm bằng từ khóa khác"
              />
            }
            renderItem={({ item }) => <PostCard post={item} />}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptySearch
            title="Tìm kiếm trên trang chủ"
            description="Nhập tên tác giả, nội dung hoặc địa điểm"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function EmptySearch({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons color={colors.textMuted} name="search-outline" size={36} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyList: { flexGrow: 1 },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 40,
    paddingVertical: 0,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
