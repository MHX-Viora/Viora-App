import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "./article-block-list";
import { ArticleBlockDragHandle } from "./article-block-drag-handle";
import { ArticleBlockTextInput } from "./article-block-text-input";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ArticleBlockView } from "@/components/article/article-renderer";
import { HashtagPicker } from "@/components/common/hashtag-picker";
import { getResponsiveContentLayout } from "@/components/layout/responsive-layout";
import { getArticlePublishError } from "@/features/article/article-publish-validation";
import { createEditorBlock, normalizeOrder, serializeEditorBlocks, type EditorArticleBlock } from "@/features/article/article-editor-blocks";
import { useResponsive } from "@/hooks/use-responsive";
import { createArticle, getArticle, updateArticle, uploadArticleMedia } from "@/services/article.service";
import { layout, spacing, type ThemeColors, useTheme } from "@/theme";
import { ArticleBlockType, type ArticleBlock } from "@/types/article";
import type { Hashtag } from "@/types/reel";
import { mergePendingHashtags } from "@/utils/hashtag-selection";

const TOOLS = [
  [ArticleBlockType.Text, "Text", "text-outline"], [ArticleBlockType.Heading, "Heading", "text"],
  [ArticleBlockType.Image, "Ảnh", "images-outline"], [ArticleBlockType.Video, "Video", "videocam-outline"],
  [ArticleBlockType.Quote, "Trích dẫn", "chatbox-ellipses-outline"], [ArticleBlockType.Divider, "Phân cách", "remove-outline"],
  [ArticleBlockType.Code, "Code", "code-slash-outline"], [ArticleBlockType.Embed, "Embed", "link-outline"],
] as const;

export function ArticleEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme } = useTheme();
  const { isDesktopWeb } = useResponsive();
  const { width } = useWindowDimensions();
  const showTopicSidebar = isDesktopWeb && width >= 1240;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const editorContentLayout = getResponsiveContentLayout({
    isDesktopWeb,
    maxWidth: layout.articleMaxWidth,
  });
  const listRef = useRef<{
    scrollToIndex: (params: { animated?: boolean; index: number; viewPosition?: number }) => void;
    scrollToOffset: (params: { animated?: boolean; offset: number }) => void;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditorArticleBlock[]>([]);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(Boolean(id));
  const [uploading, setUploading] = useState(false);
  const [publishAttempted, setPublishAttempted] = useState(false);
  const [publishServerError, setPublishServerError] = useState("");
  const [keyboardSpacer, setKeyboardSpacer] = useState(0);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [topicModal, setTopicModal] = useState(false);
  const [topicError, setTopicError] = useState('');
  const topicInput = useRef<TextInput>(null);
  const publishInFlight = useRef(false);
  const focusedBlockIndex = useRef<number | null>(null);
  const publishError = (publishAttempted ? getArticlePublishError(title, blocks) : null) || publishServerError;

  useEffect(() => {
    if (!id) return;
    getArticle(id).then((article) => { setTitle(article.title); setBlocks(article.blocks.map(createEditorBlock)); setHashtags(mergePendingHashtags((article.hashtags ?? []).map(tag => ({ ...tag, postCount: 0 })), '')); }).catch((error) => Alert.alert("Không thể tải", error.message)).finally(() => setBusy(false));
  }, [id]);

  const updateBlock = (index: number, patch: Partial<ArticleBlock>) => setBlocks((current) => current.map((block, blockIndex) => blockIndex === index ? { ...block, ...patch } : block));
  const removeBlock = (index: number) => setBlocks((current) => normalizeOrder(current.filter((_, blockIndex) => blockIndex !== index)));
  const moveBlock = (index: number, offset: number) => setBlocks((current) => {
    const target = index + offset; if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return normalizeOrder(next);
  });
  const moveBlockTo = (key: string, targetKey: string) => setBlocks(current => {
    const from = current.findIndex(block => block.clientKey === key);
    const to = current.findIndex(block => block.clientKey === targetKey);
    if (from < 0 || to < 0 || from === to) return current;
    const next = [...current];
    next.splice(to, 0, next.splice(from, 1)[0]);
    return normalizeOrder(next);
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
          const next = [...current]; next.splice(afterIndex + 1, 0, ...uploaded.map((media) => createEditorBlock({ orderIndex: 0, type: media.type, mediaUrl: media.mediaUrl, thumbnailUrl: media.thumbnailUrl, caption: "" })));
          return normalizeOrder(next);
        });
      } catch (error) { Alert.alert("Upload thất bại", error instanceof Error ? error.message : "Vui lòng thử lại."); }
      finally { setUploading(false); }
      return;
    }
    const block = createEditorBlock({ orderIndex: 0, type, content: type === ArticleBlockType.Divider ? null : "" });
    setBlocks((current) => { const next = [...current]; next.splice(afterIndex + 1, 0, block); return normalizeOrder(next); });
  };

  const publish = async () => {
    if (publishInFlight.current || uploading) return;
    setPublishAttempted(true);
    if (getArticlePublishError(title, blocks)) return;
    const selected = mergePendingHashtags(hashtags, hashtagQuery);
    if (selected.length === 0) {
      setTopicError('Thêm ít nhất một chủ đề để đăng bài.');
      if (showTopicSidebar) requestAnimationFrame(() => topicInput.current?.focus());
      else setTopicModal(true);
      return;
    }
    setHashtags(selected);
    setHashtagQuery('');
    setTopicError('');
    publishInFlight.current = true;
    try {
      setBusy(true);
      setPublishServerError("");
      const payload = { title: title.trim(), visibility: 0, blocks: serializeEditorBlocks(blocks), hashtags: selected.map(tag => tag.name) };
      const saved = id ? await updateArticle(id, payload) : await createArticle(payload);
      const reader = { pathname: "/article/[id]" as const, params: { id: saved.id } };
      setTopicModal(false);
      if (id && router.canGoBack()) router.dismissTo(reader);
      else router.replace(reader);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui lòng kiểm tra nội dung.";
      setPublishServerError(message);
      if (Platform.OS !== "web") Alert.alert("Không thể đăng bài", message);
    }
    finally { publishInFlight.current = false; setBusy(false); }
  };

  const closeEditor = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else if (id) router.replace("/article/manage");
    else router.replace({ pathname: "/", params: { category: "articles" } });
  };

  const topicFields = <View style={styles.topicFields}>
    <Text style={styles.topicHelp}>Chọn hashtag có sẵn hoặc thêm chủ đề mới để người đọc dễ tìm thấy bài của bạn.</Text>
    {topicError ? <Text accessibilityRole="alert" style={styles.topicError}>{topicError}</Text> : null}
    <HashtagPicker query={hashtagQuery} onQueryChange={setHashtagQuery} selected={hashtags}
      onChange={value => { setHashtags(value); setTopicError(''); }} inputRef={topicInput}
      label="Chọn hashtag" inputLabel="Tìm chủ đề bài báo" customHint="Thêm chủ đề này vào bài báo" showPopular disabled={busy} />
  </View>;

  if (busy && id && blocks.length === 0) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;
  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <View style={styles.header}><Pressable accessibilityLabel="Đóng" accessibilityRole="button" onPress={closeEditor} style={styles.headerClose}><Ionicons color={theme.colors.text} name="close" size={27} /></Pressable><Text numberOfLines={1} style={styles.headerTitle}>{id ? "Sửa bài viết dài" : "Bài viết dài"}</Text><View style={styles.headerActions}>{!showTopicSidebar ? <Pressable accessibilityLabel={`Chủ đề bài báo, ${hashtags.length} đã chọn`} accessibilityRole="button" onPress={() => setTopicModal(true)} style={styles.headerPreview}><Ionicons color={theme.colors.primary} name="pricetags-outline" size={22} />{hashtags.length > 0 ? <Text style={styles.topicCount}>{hashtags.length}</Text> : null}</Pressable> : null}<Pressable accessibilityLabel="Xem trước" onPress={() => setPreview(true)} style={styles.headerPreview}><Ionicons color={theme.colors.primary} name="eye-outline" size={22} /></Pressable><Pressable disabled={busy || uploading} onPress={() => void publish()}><Text style={styles.publish}>Đăng</Text></Pressable></View></View>
    {publishError ? <View accessibilityLiveRegion="assertive" style={styles.publishError}><Ionicons color={theme.colors.danger} name="alert-circle-outline" size={20} /><Text style={styles.publishErrorText}>{publishError}</Text></View> : null}
    <View style={[styles.editorBody, showTopicSidebar && styles.editorBodyWide]}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardArea}>
    <DraggableFlatList
      containerStyle={styles.editorList}
      contentContainerStyle={[styles.content, editorContentLayout, { paddingBottom: 90 + insets.bottom + keyboardSpacer }]}
      data={blocks}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.clientKey}
      ListHeaderComponent={<TextInput accessibilityLabel="Tiêu đề" multiline onChangeText={setTitle} placeholder="Tiêu đề bài viết" placeholderTextColor={theme.colors.placeholder} style={styles.titleInput} value={title} />}
      ListEmptyComponent={<Text style={styles.empty}>Chọn một loại block bên dưới để bắt đầu viết.</Text>}
      nestedScrollEnabled
      onDragEnd={({ data }) => setBlocks(normalizeOrder(data))}
      onScrollToIndexFailed={({ averageItemLength, index }) => listRef.current?.scrollToOffset({ animated: true, offset: averageItemLength * index })}
      ref={(instance) => { listRef.current = instance; }}
      scrollEnabled
      showsVerticalScrollIndicator={false}
      style={styles.editorList}
      renderItem={({ item, getIndex, drag, isActive }) => {
        const index = getIndex() ?? 0;
        return <ScaleDecorator activeScale={1.02}><View nativeID={`article-block-${item.clientKey}`} style={[styles.blockCard, isActive && styles.blockActive]}>
        <View style={styles.blockActions}>
          <Text style={styles.blockLabel}>{TOOLS.find(([type]) => type === item.type)?.[1]}</Text>
          <View style={styles.row}>
            <ArticleBlockDragHandle blockKey={item.clientKey} drag={drag} onMoveTo={targetKey => moveBlockTo(item.clientKey, targetKey)} onMoveBy={direction => moveBlock(index, direction)} />
            <Pressable accessibilityLabel="Di chuyển block lên" accessibilityRole="button" disabled={index === 0 || isActive} onPress={() => moveBlock(index, -1)} style={styles.blockAction}><Ionicons color={theme.colors.textMuted} name="arrow-up" size={20} /></Pressable>
            <Pressable accessibilityLabel="Di chuyển block xuống" accessibilityRole="button" disabled={index === blocks.length - 1 || isActive} onPress={() => moveBlock(index, 1)} style={styles.blockAction}><Ionicons color={theme.colors.textMuted} name="arrow-down" size={20} /></Pressable>
            <Pressable accessibilityLabel="Xóa block" accessibilityRole="button" disabled={isActive} onPress={() => removeBlock(index)} style={styles.blockAction}><Ionicons color={theme.colors.danger} name="trash-outline" size={20} /></Pressable>
          </View>
        </View>
        {item.type === ArticleBlockType.Divider ? <ArticleBlockView block={item} /> : item.type === ArticleBlockType.Image || item.type === ArticleBlockType.Video ? <><ArticleBlockView block={item} /><TextInput onFocus={() => focusBlock(index)} onChangeText={(caption) => updateBlock(index, { caption })} placeholder="Thêm chú thích…" placeholderTextColor={theme.colors.placeholder} style={styles.captionInput} value={item.caption || ""} /></> : <ArticleBlockTextInput onFocus={() => focusBlock(index)} onChangeText={(content) => updateBlock(index, { content })} placeholder={item.type === ArticleBlockType.Embed ? "https://…" : "Nhập nội dung…"} placeholderTextColor={theme.colors.placeholder} style={[styles.blockInput, item.type === ArticleBlockType.Heading && styles.headingInput, item.type === ArticleBlockType.Code && styles.codeInput]} value={item.content || ""} />}
        <Pressable onPress={() => void addTool(ArticleBlockType.Text, index)} style={styles.insert}><Ionicons color={theme.colors.primary} name="add-circle-outline" size={20} /><Text style={styles.insertText}>Chèn block phía dưới</Text></Pressable>
      </View></ScaleDecorator>;
      }}
    />
    {uploading ? <View style={styles.uploadOverlay}><View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.upload}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.uploadText}>Đang tải ảnh/video…</Text></View></View> : null}
    <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}><FlatList data={TOOLS} horizontal keyExtractor={([type]) => String(type)} renderItem={({ item: [type, label, icon] }) => <Pressable onPress={() => void addTool(type)} style={styles.tool}><Ionicons color={theme.colors.primary} name={icon} size={20} /><Text style={styles.toolText}>{label}</Text></Pressable>} showsHorizontalScrollIndicator={false} /></View>
    </KeyboardAvoidingView>
    {showTopicSidebar ? <ScrollView accessibilityLabel="Chủ đề bài báo" style={styles.topicSidebar} contentContainerStyle={styles.topicSidebarContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><Text style={styles.topicTitle}>Chủ đề bài báo</Text>{topicFields}</ScrollView> : null}
    </View>
    <Modal transparent visible={topicModal && !showTopicSidebar} animationType="slide" onRequestClose={() => { if (!busy) setTopicModal(false); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.topicBackdrop}>
        <View accessibilityViewIsModal style={styles.topicDialog}>
          <View style={styles.topicModalHeader}><Text style={styles.topicTitle}>Chủ đề bài báo</Text><Pressable accessibilityLabel="Đóng chủ đề" accessibilityRole="button" disabled={busy} onPress={() => { setTopicModal(false); Keyboard.dismiss(); }} style={styles.headerClose}><Ionicons color={theme.colors.text} name="close" size={24} /></Pressable></View>
          <ScrollView style={styles.topicModalScroll} contentContainerStyle={styles.topicSidebarContent} keyboardShouldPersistTaps="handled">{topicFields}{publishServerError ? <Text accessibilityRole="alert" style={styles.topicError}>{publishServerError}</Text> : null}</ScrollView>
          <Pressable accessibilityRole="button" disabled={busy || uploading} onPress={() => void publish()} style={[styles.topicPublish, (busy || uploading) && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color={theme.colors.primaryContrast} /> : <Text style={styles.topicPublishText}>{id ? 'Lưu thay đổi' : 'Đăng bài'}</Text>}</Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <Modal animationType="slide" onRequestClose={() => setPreview(false)} visible={preview}><SafeAreaView edges={["top", "bottom"]} style={styles.screen}><View style={styles.header}><Pressable onPress={() => setPreview(false)}><Ionicons color={theme.colors.text} name="close" size={27} /></Pressable><Text style={styles.headerTitle}>Xem trước</Text><View style={{ width: 27 }} /></View><FlatList contentContainerStyle={[styles.previewContent, editorContentLayout]} data={blocks} keyExtractor={(item, index) => item.id || String(index)} ListHeaderComponent={<Text style={styles.previewTitle}>{title || "Chưa có tiêu đề"}</Text>} renderItem={({ item }) => <ArticleBlockView block={item} />} ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />} /></SafeAreaView></Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  editorBody: { flex: 1, minHeight: 0, width: '100%' },
  editorBodyWide: { paddingHorizontal: 300 + spacing.lg * 2 },
  topicFields: { gap: spacing.md }, topicHelp: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  topicError: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  topicSidebar: { position: 'absolute', top: spacing.md, bottom: spacing.md, right: spacing.lg, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, width: 300 },
  topicSidebarContent: { padding: spacing.lg, gap: spacing.md },
  topicTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  topicCount: { position: 'absolute', top: 0, right: 0, color: colors.primary, fontSize: 11, fontWeight: '800' },
  topicBackdrop: { backgroundColor: colors.overlay, flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  topicDialog: { backgroundColor: colors.surface, width: '100%', maxWidth: 520, maxHeight: '90%', borderRadius: 16, overflow: 'hidden' },
  topicModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.sm, gap: spacing.sm },
  topicModalScroll: { flexShrink: 1 },
  topicPublish: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', minHeight: 48, margin: spacing.lg, borderRadius: 12 },
  topicPublishText: { color: colors.primaryContrast, fontWeight: '800', fontSize: 15 },
  headerClose: { alignItems: "center", justifyContent: "center", height: 44, width: 44 },
  blockActions: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, blockCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  blockActive: { borderColor: colors.primary, shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 8 },
  blockInput: { color: colors.text, fontSize: 17, lineHeight: 25, minHeight: 56, textAlignVertical: "top" }, blockLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }, bottom: { alignItems: "center", backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, bottom: 0, flexDirection: "row", left: 0, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, position: "absolute", right: 0 },
  captionInput: { color: colors.textMuted, fontSize: 14, paddingVertical: spacing.xs }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" }, codeInput: { fontFamily: "monospace" }, content: { padding: spacing.md, paddingBottom: 110 }, empty: { color: colors.textMuted, padding: spacing.xl, textAlign: "center" },
  header: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 56, paddingHorizontal: spacing.md }, headerActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, headerPreview: { alignItems: "center", height: 40, justifyContent: "center", width: 40 }, headerTitle: { color: colors.text, fontSize: 16, fontWeight: "800", flex: 1, minWidth: 0, textAlign: "center" }, headingInput: { fontSize: 23, lineHeight: 31, minHeight: 40, fontWeight: "800" }, insert: { alignItems: "center", flexDirection: "row", gap: spacing.xs, paddingTop: spacing.xs }, insertText: { color: colors.primary, fontSize: 13 },
  publishError: { alignItems: "center", backgroundColor: colors.dangerSoft, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, publishErrorText: { color: colors.danger, flex: 1, fontSize: 13, lineHeight: 19 },
  blockAction: { alignItems: "center", justifyContent: "center", width: 32, height: 40 },
  editorList: { flex: 1, minHeight: 0 }, keyboardArea: { flex: 1, minWidth: 0, minHeight: 0 }, previewContent: { padding: spacing.lg }, previewTitle: { color: colors.text, fontSize: 34, fontWeight: "900", lineHeight: 41, marginBottom: spacing.xl }, publish: { color: colors.primary, fontSize: 15, fontWeight: "800" }, row: { alignItems: "center", flexDirection: "row", gap: spacing.xs }, screen: { backgroundColor: colors.background, flex: 1 },
  titleInput: { color: colors.text, fontSize: 32, fontWeight: "900", lineHeight: 39, marginBottom: spacing.xl, minHeight: 100, textAlignVertical: "top" }, tool: { alignItems: "center", gap: 3, minWidth: 58, paddingHorizontal: spacing.xs }, toolText: { color: colors.text, fontSize: 10 }, uploadOverlay: { pointerEvents: "box-none", position: "absolute", top: spacing.lg, left: spacing.lg, right: spacing.lg, alignItems: "center" }, upload: { alignItems: "center", backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1, borderRadius: 12, flexDirection: "row", gap: spacing.sm, maxWidth: 360, width: "100%", padding: spacing.md }, uploadText: { color: colors.text },
});
