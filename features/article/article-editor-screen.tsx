import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ArticleBlockView } from "@/components/article/article-renderer";
import { createArticle, getArticle, updateArticle, uploadArticleMedia } from "@/services/article.service";
import { spacing, type ThemeColors, useTheme } from "@/theme";
import { ArticleBlockType, type ArticleBlock } from "@/types/article";

const TOOLS = [
  [ArticleBlockType.Text, "Text", "text-outline"], [ArticleBlockType.Heading, "Heading", "text"],
  [ArticleBlockType.Image, "Ảnh", "images-outline"], [ArticleBlockType.Video, "Video", "videocam-outline"],
  [ArticleBlockType.Quote, "Trích dẫn", "chatbox-ellipses-outline"], [ArticleBlockType.Divider, "Phân cách", "remove-outline"],
  [ArticleBlockType.Code, "Code", "code-slash-outline"], [ArticleBlockType.Embed, "Embed", "link-outline"],
] as const;

const normalizeOrder = (blocks: ArticleBlock[]) => blocks.map((block, orderIndex) => ({ ...block, orderIndex }));

export function ArticleEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const listRef = useRef<{
    scrollToIndex: (params: { animated?: boolean; index: number; viewPosition?: number }) => void;
    scrollToOffset: (params: { animated?: boolean; offset: number }) => void;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(Boolean(id));
  const [uploading, setUploading] = useState(false);
  const [keyboardSpacer, setKeyboardSpacer] = useState(0);
  const focusedBlockIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    getArticle(id).then((article) => { setTitle(article.title); setBlocks(article.blocks); }).catch((error) => Alert.alert("Không thể tải", error.message)).finally(() => setBusy(false));
  }, [id]);

  const updateBlock = (index: number, patch: Partial<ArticleBlock>) => setBlocks((current) => current.map((block, blockIndex) => blockIndex === index ? { ...block, ...patch } : block));
  const removeBlock = (index: number) => setBlocks((current) => normalizeOrder(current.filter((_, blockIndex) => blockIndex !== index)));
  const moveBlock = (index: number, offset: number) => setBlocks((current) => {
    const target = index + offset; if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return normalizeOrder(next);
  });
  const revealBlock = (index: number) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ animated: true, index, viewPosition: 0.2 });
    });
  };
  const focusBlock = (index: number) => {
    focusedBlockIndex.current = index;
    revealBlock(index);
  };

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardSpacer(Math.min(Math.round(event.endCoordinates.height * 0.7), 260));
      if (focusedBlockIndex.current !== null) {
        setTimeout(() => revealBlock(focusedBlockIndex.current!), Platform.OS === "ios" ? 120 : 40);
      }
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardSpacer(0);
      focusedBlockIndex.current = null;
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const addTool = async (type: ArticleBlockType, afterIndex = blocks.length - 1) => {
    if (type === ArticleBlockType.Image || type === ArticleBlockType.Video) {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: type === ArticleBlockType.Image ? ["images"] : ["videos"], allowsMultipleSelection: type === ArticleBlockType.Image, quality: 0.9 });
      if (result.canceled) return;
      try {
        setUploading(true);
        const uploaded = await uploadArticleMedia(result.assets.map((asset) => asset.uri));
        setBlocks((current) => {
          const next = [...current]; next.splice(afterIndex + 1, 0, ...uploaded.map((media) => ({ orderIndex: 0, type: media.type, mediaUrl: media.mediaUrl, thumbnailUrl: media.thumbnailUrl, caption: "" })));
          return normalizeOrder(next);
        });
      } catch (error) { Alert.alert("Upload thất bại", error instanceof Error ? error.message : "Vui lòng thử lại."); }
      finally { setUploading(false); }
      return;
    }
    const block: ArticleBlock = { orderIndex: 0, type, content: type === ArticleBlockType.Divider ? null : "" };
    setBlocks((current) => { const next = [...current]; next.splice(afterIndex + 1, 0, block); return normalizeOrder(next); });
  };

  const publish = async () => {
    if (!title.trim()) return Alert.alert("Thiếu tiêu đề", "Vui lòng nhập tiêu đề bài viết.");
    try {
      setBusy(true);
      const payload = { title: title.trim(), visibility: 0, blocks: normalizeOrder(blocks).map(({ createdAt: _createdAt, updatedAt: _updatedAt, ...block }) => block) };
      const saved = id ? await updateArticle(id, payload) : await createArticle(payload);
      router.replace({ pathname: "/article/[id]", params: { id: saved.id } });
    } catch (error) { Alert.alert("Không thể đăng bài", error instanceof Error ? error.message : "Vui lòng kiểm tra nội dung."); }
    finally { setBusy(false); }
  };

  if (busy && id && blocks.length === 0) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;
  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <View style={styles.header}><Pressable accessibilityLabel="Đóng" onPress={() => router.back()}><Ionicons color={theme.colors.text} name="close" size={27} /></Pressable><Text style={styles.headerTitle}>{id ? "Sửa bài viết dài" : "Bài viết dài"}</Text><View style={styles.headerActions}><Pressable accessibilityLabel="Xem trước" onPress={() => setPreview(true)} style={styles.headerPreview}><Ionicons color={theme.colors.primary} name="eye-outline" size={22} /></Pressable><Pressable disabled={busy || uploading} onPress={() => void publish()}><Text style={styles.publish}>Đăng</Text></Pressable></View></View>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardArea}>
    <DraggableFlatList
      contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom + keyboardSpacer }]}
      data={blocks}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item, index) => item.id || `${item.type}-${index}`}
      ListHeaderComponent={<TextInput accessibilityLabel="Tiêu đề" multiline onChangeText={setTitle} placeholder="Tiêu đề bài viết" placeholderTextColor={theme.colors.placeholder} style={styles.titleInput} value={title} />}
      ListEmptyComponent={<Text style={styles.empty}>Chọn một loại block bên dưới để bắt đầu viết.</Text>}
      onDragEnd={({ data }) => setBlocks(normalizeOrder(data))}
      onScrollToIndexFailed={({ averageItemLength, index }) => listRef.current?.scrollToOffset({ animated: true, offset: averageItemLength * index })}
      ref={(instance) => { listRef.current = instance; }}
      renderItem={({ item, getIndex, drag, isActive }) => {
        const index = getIndex() ?? 0;
        return <ScaleDecorator><View style={[styles.blockCard, isActive && styles.blockActive]}>
        <View style={styles.blockActions}><Text style={styles.blockLabel}>{TOOLS.find(([type]) => type === item.type)?.[1]}</Text><View style={styles.row}><Pressable disabled={index === 0} onPress={() => moveBlock(index, -1)}><Ionicons color={theme.colors.textMuted} name="arrow-up" size={20} /></Pressable><Pressable disabled={index === blocks.length - 1} onPress={() => moveBlock(index, 1)}><Ionicons color={theme.colors.textMuted} name="arrow-down" size={20} /></Pressable><Pressable onPress={() => removeBlock(index)}><Ionicons color={theme.colors.danger} name="trash-outline" size={20} /></Pressable></View></View>
        <Pressable accessibilityLabel="Giữ và kéo để đổi vị trí block" onLongPress={drag} style={styles.dragHandle}><Ionicons color={theme.colors.textMuted} name="reorder-three-outline" size={26} /><Text style={styles.dragText}>Giữ để kéo thả</Text></Pressable>
        {item.type === ArticleBlockType.Divider ? <ArticleBlockView block={item} /> : item.type === ArticleBlockType.Image || item.type === ArticleBlockType.Video ? <><ArticleBlockView block={item} /><TextInput onFocus={() => focusBlock(index)} onChangeText={(caption) => updateBlock(index, { caption })} placeholder="Thêm chú thích…" placeholderTextColor={theme.colors.placeholder} style={styles.captionInput} value={item.caption || ""} /></> : <TextInput multiline onFocus={() => focusBlock(index)} onChangeText={(content) => updateBlock(index, { content })} placeholder={item.type === ArticleBlockType.Embed ? "https://…" : "Nhập nội dung…"} placeholderTextColor={theme.colors.placeholder} style={[styles.blockInput, item.type === ArticleBlockType.Heading && styles.headingInput, item.type === ArticleBlockType.Code && styles.codeInput]} value={item.content || ""} />}
        <Pressable onPress={() => void addTool(ArticleBlockType.Text, index)} style={styles.insert}><Ionicons color={theme.colors.primary} name="add-circle-outline" size={20} /><Text style={styles.insertText}>Chèn block phía dưới</Text></Pressable>
      </View></ScaleDecorator>;
      }}
    />
    {uploading ? <View style={styles.upload}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.uploadText}>Đang tải media…</Text></View> : null}
    <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}><FlatList data={TOOLS} horizontal keyExtractor={([type]) => String(type)} renderItem={({ item: [type, label, icon] }) => <Pressable onPress={() => void addTool(type)} style={styles.tool}><Ionicons color={theme.colors.primary} name={icon} size={20} /><Text style={styles.toolText}>{label}</Text></Pressable>} showsHorizontalScrollIndicator={false} /></View>
    </KeyboardAvoidingView>
    <Modal animationType="slide" onRequestClose={() => setPreview(false)} visible={preview}><SafeAreaView edges={["top", "bottom"]} style={styles.screen}><View style={styles.header}><Pressable onPress={() => setPreview(false)}><Ionicons color={theme.colors.text} name="close" size={27} /></Pressable><Text style={styles.headerTitle}>Xem trước</Text><View style={{ width: 27 }} /></View><FlatList contentContainerStyle={styles.previewContent} data={blocks} keyExtractor={(item, index) => item.id || String(index)} ListHeaderComponent={<Text style={styles.previewTitle}>{title || "Chưa có tiêu đề"}</Text>} renderItem={({ item }) => <ArticleBlockView block={item} />} ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />} /></SafeAreaView></Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  blockActions: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, blockCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  blockActive: { borderColor: colors.primary, shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 8 },
  blockInput: { color: colors.text, fontSize: 17, lineHeight: 25, minHeight: 90, textAlignVertical: "top" }, blockLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }, bottom: { alignItems: "center", backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, bottom: 0, flexDirection: "row", left: 0, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, position: "absolute", right: 0 },
  captionInput: { color: colors.textMuted, fontSize: 14, paddingVertical: spacing.xs }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" }, codeInput: { fontFamily: "monospace" }, content: { padding: spacing.md, paddingBottom: 110 }, empty: { color: colors.textMuted, padding: spacing.xl, textAlign: "center" },
  header: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 56, paddingHorizontal: spacing.md }, headerActions: { alignItems: "center", flexDirection: "row", gap: spacing.md }, headerPreview: { alignItems: "center", height: 40, justifyContent: "center", width: 40 }, headerTitle: { color: colors.text, fontSize: 16, fontWeight: "800" }, headingInput: { fontSize: 23, fontWeight: "800" }, insert: { alignItems: "center", flexDirection: "row", gap: spacing.xs, paddingTop: spacing.xs }, insertText: { color: colors.primary, fontSize: 13 },
  dragHandle: { alignItems: "center", flexDirection: "row", gap: spacing.xs, justifyContent: "center", paddingVertical: spacing.xs }, dragText: { color: colors.textMuted, fontSize: 12 },
  keyboardArea: { flex: 1 }, previewContent: { padding: spacing.lg }, previewTitle: { color: colors.text, fontSize: 34, fontWeight: "900", lineHeight: 41, marginBottom: spacing.xl }, publish: { color: colors.primary, fontSize: 15, fontWeight: "800" }, row: { flexDirection: "row", gap: spacing.md }, screen: { backgroundColor: colors.background, flex: 1 },
  titleInput: { color: colors.text, fontSize: 32, fontWeight: "900", lineHeight: 39, marginBottom: spacing.xl, minHeight: 100, textAlignVertical: "top" }, tool: { alignItems: "center", gap: 3, minWidth: 58, paddingHorizontal: spacing.xs }, toolText: { color: colors.text, fontSize: 10 }, upload: { alignItems: "center", backgroundColor: colors.surfaceElevated, borderRadius: 12, flexDirection: "row", gap: spacing.sm, left: spacing.lg, padding: spacing.md, position: "absolute", right: spacing.lg, top: 70 }, uploadText: { color: colors.text },
});
