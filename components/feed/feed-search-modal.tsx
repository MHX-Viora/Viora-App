import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Animated,
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
import { getPosts } from "@/services/feed.service";
import { spacing } from "@/theme";
import type { FeedPost } from "@/types/feed";
import { type ThemeColors, useTheme } from "@/theme";


const PAGE_SIZE = 10;

export function FeedSearchModal({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedQuery = query.trim();

  const searchPosts = async (keyword: string, nextPage: number) => {
    if (!keyword) return;

    if (nextPage === 1) {
      setIsSearching(true);
      setErrorMessage("");
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await getPosts({
        keyword,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setResults((current) =>
        nextPage === 1 ? result.posts : [...current, ...result.posts],
      );
      setPage(nextPage);
      setTotalPages(result.totalPages);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể tìm kiếm bài viết.",
      );
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!visible) return;

    if (!normalizedQuery) {
      setResults([]);
      setPage(1);
      setTotalPages(1);
      setErrorMessage("");
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      searchPosts(normalizedQuery, 1);
    }, 350);

    return () => clearTimeout(timer);
  }, [normalizedQuery, visible]);

  const loadMoreResults = () => {
    if (!normalizedQuery || isSearching || isLoadingMore || page >= totalPages) {
      return;
    }

    searchPosts(normalizedQuery, page + 1);
  };

  const close = () => {
    setQuery("");
    setResults([]);
    setErrorMessage("");
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
              isSearching ? (
                <>
                  <SearchSkeleton />
                  <SearchSkeleton />
                  <SearchSkeleton />
                </>
              ) : (
                <EmptySearch
                  title={errorMessage || "Không tìm thấy bài viết"}
                  description="Thử tìm bằng từ khóa khác"
                />
              )
            }
            ListFooterComponent={isLoadingMore ? <SearchSkeleton /> : null}
            onEndReached={loadMoreResults}
            onEndReachedThreshold={0.35}
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

function SearchSkeleton() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 650,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 650,
          toValue: 0.45,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
        <View style={styles.skeletonTextBlock}>
          <Animated.View style={[styles.skeletonLineLarge, { opacity }]} />
          <Animated.View style={[styles.skeletonLineSmall, { opacity }]} />
        </View>
      </View>
      <Animated.View style={[styles.skeletonBodyLine, { opacity }]} />
      <Animated.View style={[styles.skeletonMedia, { opacity }]} />
    </View>
  );
}

function EmptySearch({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.emptyState}>
      <Ionicons color={colors.textMuted} name="search-outline" size={36} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 20,
    borderWidth: 1,
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
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skeletonAvatar: {
    backgroundColor: colors.border,
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  skeletonBodyLine: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    width: "75%",
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    overflow: "hidden",
    paddingBottom: spacing.md,
  },
  skeletonHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  skeletonLineLarge: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 13,
    width: 130,
  },
  skeletonLineSmall: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 11,
    marginTop: spacing.sm,
    width: 90,
  },
  skeletonMedia: {
    backgroundColor: colors.border,
    height: 180,
    marginTop: spacing.md,
    width: "100%",
  },
  skeletonTextBlock: { flex: 1 },
});
