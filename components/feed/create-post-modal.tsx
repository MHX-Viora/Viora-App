import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing, typography } from "@/theme";
import { normalizeFeedImageUri } from "@/features/feed/image-source";

type Props = {
  imageUris: string[];
  onClose: () => void;
  onPickImage: () => void;
  onRemoveImage: (index: number) => void;
  onSubmit: (body: string) => void;
  visible: boolean;
};

export function CreatePostModal({
  imageUris,
  onClose,
  onPickImage,
  onRemoveImage,
  onSubmit,
  visible,
}: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!visible) setBody("");
  }, [visible]);

  const canSubmit = body.trim().length > 0 || imageUris.length > 0;

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Đóng hộp tạo bài viết"
              accessibilityRole="button"
              onPress={onClose}
            >
              <Ionicons color={colors.text} name="close" size={28} />
            </Pressable>
            <Text style={styles.title}>Tạo bài viết</Text>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={() => onSubmit(body.trim())}
            >
              <Text style={[styles.submit, !canSubmit && styles.submitDisabled]}>
                Đăng
              </Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 40) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              autoFocus
              maxLength={3000}
              multiline
              onChangeText={setBody}
              placeholder="Bạn muốn chia sẻ điều gì?"
              placeholderTextColor={colors.textMuted}
              ref={inputRef}
              scrollEnabled={false}
              style={styles.input}
              value={body}
            />

            {imageUris.length > 0 && (
              <View style={styles.previewGrid}>
                {imageUris.map((uri, index) => {
                  const isWideTile =
                    imageUris.length === 1 ||
                    (imageUris.length === 3 && index === 0);

                  return (
                    <View
                      key={`${index}-${uri.length}`}
                      style={[
                        styles.previewTile,
                        isWideTile ? styles.wideTile : styles.halfTile,
                        imageUris.length === 1 && styles.singleTile,
                        imageUris.length === 3 &&
                          index > 0 &&
                          styles.compactTile,
                      ]}
                    >
                      <Image
                        accessibilityLabel={`Ảnh đã chọn ${index + 1}`}
                        resizeMode="cover"
                        source={{ uri: normalizeFeedImageUri(uri) }}
                        style={styles.preview}
                      />
                      <Pressable
                        accessibilityLabel={`Bỏ ảnh đã chọn ${index + 1}`}
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => onRemoveImage(index)}
                        style={styles.removeImageButton}
                      >
                        <Ionicons color="#ffffff" name="close" size={18} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={imageUris.length >= 4}
              onPress={() => {
                inputRef.current?.blur();
                Keyboard.dismiss();
                onPickImage();
              }}
              style={[
                styles.imageButton,
                imageUris.length >= 4 && styles.imageButtonDisabled,
              ]}
            >
              <View style={styles.imageIcon}>
                <Ionicons color={colors.primary} name="images" size={25} />
              </View>
              <View style={styles.imageCopy}>
                <Text style={styles.imageButtonText}>
                  {imageUris.length >= 4
                    ? "Đã chọn tối đa 4 ảnh"
                    : imageUris.length > 0
                      ? "Thêm ảnh khác"
                      : "Thêm ảnh vào bài viết"}
                </Text>
                <Text style={styles.imageHint}>Chọn tối đa 4 ảnh từ thư viện</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{imageUris.length}/4</Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(15,23,42,0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  countBadge: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  countText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  imageButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  imageButtonText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  imageButtonDisabled: { opacity: 0.55 },
  imageCopy: { flex: 1, gap: 2 },
  imageHint: { color: colors.textMuted, fontSize: 13 },
  imageIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  input: {
    color: colors.text,
    fontSize: 17,
    minHeight: 120,
    paddingBottom: spacing.lg,
    textAlignVertical: "top",
  },
  compactTile: { height: 136 },
  halfTile: { height: 160, width: "48.5%" },
  preview: { height: "100%", width: "100%" },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    width: "100%",
  },
  previewTile: {
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  removeImageButton: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: spacing.xs,
    top: spacing.xs,
    width: 28,
  },
  scrollContent: { padding: spacing.lg },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: "88%",
    overflow: "hidden",
  },
  singleTile: { height: 220 },
  submit: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  submitDisabled: { opacity: 0.4 },
  title: { ...typography.title, color: colors.text },
  wideTile: { height: 190, width: "100%" },
});
