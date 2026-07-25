import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReelsGridViewer } from "@/components/reels/reels-grid-viewer";
import { reelsColors as colors } from "@/features/reels/reels-colors";
import { spacing } from "@/theme";
import type { Reel } from "@/types/reel";

export function ReelsSearchModal({
  onClose,
  onComment,
  onCommentCreated,
  onDelete,
  onOpenAuthor,
  onReact,
  onSave,
  onSearch,
  onShare,
  onViewingChange,
  paused,
  visible,
}: {
  onClose: () => void;
  onComment?: (reelId: string) => void;
  onCommentCreated?: { id: string; nonce: number } | null;
  onDelete?: (reelId: string) => void;
  onOpenAuthor?: (userId: string) => void;
  onReact?: (reelId: string) => void;
  onSave?: (reelId: string) => void;
  onSearch: (keyword: string) => Promise<Reel[]>;
  onShare?: (reel: Reel) => void;
  onViewingChange?: (viewing: boolean) => void;
  paused?: boolean;
  visible: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Reel[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");

  const close = () => {
    setQuery("");
    setResults([]);
    setError("");
    setLoading(false);
    onClose();
  };

  useEffect(() => {
    if (!visible || !normalizedQuery) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    let ignored = false;
    setLoading(true);
    setError("");

    const timer = setTimeout(() => {
      onSearch(query)
        .then((nextResults) => {
          if (!ignored) setResults(nextResults);
        })
        .catch((searchError: unknown) => {
          if (!ignored) {
            setResults([]);
            setError(
              searchError instanceof Error
                ? searchError.message
                : "Không thể tìm kiếm reels.",
            );
          }
        })
        .finally(() => {
          if (!ignored) setLoading(false);
        });
    }, 350);

    return () => {
      ignored = true;
      clearTimeout(timer);
    };
  }, [normalizedQuery, onSearch, query, visible]);

  const searchHeader = (
    <View style={[styles.searchBox, styles.floatingSearchBox]}>
      <Ionicons color={colors.white} name="search" size={20} />
      <TextInput
        accessibilityLabel="Tìm kiếm video ngắn"
        onChangeText={setQuery}
        placeholder="Tìm video, người đăng, hashtag..."
        placeholderTextColor="rgba(255,255,255,0.78)"
        returnKeyType="search"
        style={[styles.input, styles.floatingInput]}
        value={query}
      />
      {query.length > 0 && (
        <Pressable
          accessibilityLabel="Xóa nội dung tìm kiếm"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setQuery("")}
        >
          <Ionicons color={colors.white} name="close-circle" size={20} />
        </Pressable>
      )}
    </View>
  );

  return (
    <Modal animationType="slide" onRequestClose={close} visible={visible}>
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Đóng tìm kiếm video"
            accessibilityRole="button"
            hitSlop={8}
            onPress={close}
            style={styles.backButton}
          >
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </Pressable>
          <View style={styles.searchBox}>
            <Ionicons color={colors.textMuted} name="search" size={20} />
            <TextInput
              accessibilityLabel="Tìm kiếm video ngắn"
              autoFocus
              onChangeText={setQuery}
              placeholder="Tìm video, người đăng, hashtag..."
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
          loading ? (
            <ReelSearchSkeleton />
          ) : results.length > 0 ? (
            <ReelsGridViewer
              header={searchHeader}
              onComment={onComment}
              onCommentCreated={onCommentCreated}
              onDelete={onDelete}
              onOpenAuthor={onOpenAuthor}
              onReact={onReact}
              onSave={onSave}
              onShare={onShare}
              onViewingChange={onViewingChange}
              paused={paused}
              reels={results}
            />
          ) : (
            <EmptySearch
              title="Không tìm thấy video"
              description={error || "Thử tìm bằng từ khóa hoặc hashtag khác"}
            />
          )
        ) : (
          <EmptySearch
            title="Tìm kiếm video ngắn"
            description="Nhập tên người đăng, nội dung hoặc hashtag"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function ReelSearchSkeleton() {
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
    <View
      accessibilityLabel="Đang tải kết quả tìm kiếm"
      style={styles.skeletonGrid}
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <View key={index} style={styles.skeletonItem}>
          <Animated.View style={[styles.skeletonPoster, { opacity }]} />
          <Animated.View style={[styles.skeletonLine, { opacity }]} />
          <Animated.View style={[styles.skeletonMeta, { opacity }]} />
        </View>
      ))}
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
  return (
    <View style={styles.emptyState}>
      <Ionicons color={colors.textMuted} name="videocam-outline" size={38} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
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
  floatingInput: { color: colors.white },
  floatingSearchBox: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
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
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  skeletonItem: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    borderWidth: 1,
    paddingBottom: spacing.md,
    paddingHorizontal: 3,
    width: "33.333%",
  },
  skeletonLine: {
    backgroundColor: colors.border,
    borderRadius: 5,
    height: 10,
    marginTop: 8,
    width: "88%",
  },
  skeletonMeta: {
    backgroundColor: colors.border,
    borderRadius: 5,
    height: 9,
    marginTop: 6,
    width: "58%",
  },
  skeletonPoster: {
    aspectRatio: 9 / 16,
    backgroundColor: colors.border,
    borderRadius: 8,
    width: "100%",
  },
});
