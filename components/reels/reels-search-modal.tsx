import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";
import type { Reel } from "@/types/reel";

export function ReelsSearchModal({ onClose, reels, visible }: { onClose: () => void; reels: readonly Reel[]; visible: boolean }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const results = useMemo(
    () => normalizedQuery
      ? reels.filter((reel) => [reel.author, reel.caption, reel.hashtags].some((value) => value.toLocaleLowerCase("vi").includes(normalizedQuery)))
      : [],
    [normalizedQuery, reels],
  );
  const close = () => { setQuery(""); onClose(); };

  return (
    <Modal animationType="slide" onRequestClose={close} visible={visible}>
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Đóng tìm kiếm video" accessibilityRole="button" hitSlop={8} onPress={close} style={styles.backButton}>
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </Pressable>
          <View style={styles.searchBox}>
            <Ionicons color={colors.textMuted} name="search" size={20} />
            <TextInput accessibilityLabel="Tìm kiếm video ngắn" autoFocus onChangeText={setQuery} placeholder="Tìm video, người đăng, hashtag..." placeholderTextColor={colors.textMuted} returnKeyType="search" style={styles.input} value={query} />
            {query.length > 0 && (
              <Pressable accessibilityLabel="Xóa nội dung tìm kiếm" accessibilityRole="button" hitSlop={8} onPress={() => setQuery("")}>
                <Ionicons color={colors.textMuted} name="close-circle" size={20} />
              </Pressable>
            )}
          </View>
        </View>

        {normalizedQuery ? (
          <FlatList
            contentContainerStyle={[styles.listContent, results.length === 0 && styles.emptyList]}
            data={results}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<EmptySearch title="Không tìm thấy video" description="Thử tìm bằng từ khóa hoặc hashtag khác" />}
            renderItem={({ item }) => <ReelSearchResult reel={item} />}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptySearch title="Tìm kiếm video ngắn" description="Nhập tên người đăng, nội dung hoặc hashtag" />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function ReelSearchResult({ reel }: { reel: Reel }) {
  return (
    <View accessibilityLabel={`Video của ${reel.author}: ${reel.caption}`} style={styles.result}>
      <Image accessibilityLabel={`Ảnh đại diện của ${reel.author}`} source={reel.avatar} style={styles.avatar} />
      <View style={styles.resultCopy}>
        <Text numberOfLines={1} style={styles.author}>@{reel.author}</Text>
        <Text numberOfLines={2} style={styles.caption}>{reel.caption}</Text>
        <Text numberOfLines={1} style={styles.hashtags}>{reel.hashtags}</Text>
      </View>
    </View>
  );
}

function EmptySearch({ description, title }: { description: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons color={colors.textMuted} name="videocam-outline" size={38} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  author: { color: colors.text, fontSize: 15, fontWeight: "700" },
  avatar: { borderRadius: 30, height: 60, width: 60 },
  backButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  caption: { color: colors.text, fontSize: 14, lineHeight: 19, marginTop: 3 },
  emptyList: { flexGrow: 1 },
  emptyState: { alignItems: "center", flex: 1, justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs, textAlign: "center" },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: spacing.sm },
  hashtags: { color: colors.primary, fontSize: 13, marginTop: spacing.xs },
  header: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  input: { color: colors.text, flex: 1, fontSize: 15, minHeight: 40, paddingVertical: 0 },
  listContent: { paddingHorizontal: spacing.md },
  result: { alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 96, paddingVertical: spacing.sm },
  resultCopy: { flex: 1 },
  screen: { backgroundColor: colors.surface, flex: 1 },
  searchBox: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md },
  separator: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 76 },
});
