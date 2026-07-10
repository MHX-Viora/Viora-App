import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type Props = { imageUris: string[]; onClose: () => void; onPickImage: () => void; onSubmit: (body: string) => void; visible: boolean };

export function CreatePostModal({ imageUris, onClose, onPickImage, onSubmit, visible }: Props) {
  const [body, setBody] = useState('');
  useEffect(() => { if (!visible) setBody(''); }, [visible]);
  const canSubmit = body.trim().length > 0 || imageUris.length > 0;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="Đóng hộp tạo bài viết" accessibilityRole="button" onPress={onClose}><Ionicons color={colors.text} name="close" size={28} /></Pressable>
            <Text style={styles.title}>Tạo bài viết</Text>
            <Pressable accessibilityRole="button" disabled={!canSubmit} onPress={() => onSubmit(body.trim())}><Text style={[styles.submit, !canSubmit && styles.submitDisabled]}>Đăng</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput autoFocus maxLength={3000} multiline onChangeText={setBody} placeholder="Bạn muốn chia sẻ điều gì?" placeholderTextColor={colors.textMuted} scrollEnabled={false} style={styles.input} value={body} />
            <Pressable accessibilityRole="button" onPress={onPickImage} style={styles.imageButton}>
              <View style={styles.imageIcon}><Ionicons color={colors.primary} name="images" size={25} /></View>
              <View style={styles.imageCopy}><Text style={styles.imageButtonText}>Thêm ảnh vào bài viết</Text><Text style={styles.imageHint}>Chọn tối đa 4 ảnh từ thư viện</Text></View>
              <View style={styles.countBadge}><Text style={styles.countText}>{imageUris.length}/4</Text></View>
            </Pressable>
            {imageUris.length > 0 && (
              <View style={styles.previewGrid}>
                {imageUris.map((uri, index) => <Image accessibilityLabel={`Ảnh đã chọn ${index + 1}`} contentFit="cover" key={uri} source={uri} style={[styles.preview, imageUris.length === 1 && styles.singlePreview]} />)}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(15,23,42,0.45)', flex: 1, justifyContent: 'flex-end' }, countBadge: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, countText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  header: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, imageButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 14, flexDirection: 'row', gap: spacing.md, padding: spacing.md }, imageButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' }, imageCopy: { flex: 1, gap: 2 }, imageHint: { color: colors.textMuted, fontSize: 13 }, imageIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  input: { color: colors.text, fontSize: 17, minHeight: 120, paddingBottom: spacing.lg, textAlignVertical: 'top' }, preview: { aspectRatio: 1, borderRadius: 10, width: '48.5%' }, previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }, scrollContent: { padding: spacing.lg, paddingBottom: 40 }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, height: '88%', overflow: 'hidden' }, singlePreview: { aspectRatio: 16 / 10, width: '100%' }, submit: { color: colors.primary, fontSize: 16, fontWeight: '700' }, submitDisabled: { opacity: 0.4 }, title: { ...typography.title, color: colors.text },
});
