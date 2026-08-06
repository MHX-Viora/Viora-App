import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { ViewableImage } from "@/components/common/viewable-image";
import { MentionSuggestions } from "@/components/mentions/mention-suggestions";
import { normalizeFeedImageUri } from "@/features/feed/image-source";
import { spacing, typography } from "@/theme";
import type { CreatePostInput } from "@/types/feed";
import type { MentionReference, MentionUser } from "@/types/mention";
import { activeMentionIds, insertMention } from "@/utils/mention-composer";
import { type ThemeColors, useTheme } from "@/theme";


type Props = {
  imageUris: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onRemoveImage: (index: number) => void;
  onSubmit: (payload: CreatePostInput) => void;
  visible: boolean;
};

export function CreatePostModal({
  imageUris,
  isSubmitting,
  onClose,
  onPickImage,
  onRemoveImage,
  onSubmit,
  visible,
}: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [visibility, setVisibility] = useState(0);
  const [mentions, setMentions] = useState<MentionReference[]>([]);

  useEffect(() => {
    if (!visible) {
      setBody("");
      setLink("");
      setLocationName("");
      setLatitude(undefined);
      setLongitude(undefined);
      setShowLinkInput(false);
      setShowLocationInput(false);
      setIsGettingLocation(false);
      setVisibility(0);
      setMentions([]);
    }
  }, [visible]);

  const canSubmit =
    !isSubmitting && (body.trim().length > 0 || imageUris.length > 0);

  const formatAddress = (address: Location.LocationGeocodedAddress) => {
    const city = address.city || address.region;
    return city?.trim() || address.name?.trim() || "";
  };

  const addCurrentLocation = async () => {
    setIsGettingLocation(true);

    try {
      if (Platform.OS !== "web") {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Cần quyền truy cập",
            "Hãy cho phép ANKT truy cập vị trí để gắn vị trí vào bài viết.",
          );
          return;
        }
      }

      const position = await Location.getCurrentPositionAsync({});
      const addresses = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const currentAddress = addresses[0];
      const nextLocationName = currentAddress
        ? formatAddress(currentAddress)
        : "";

      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setLocationName(nextLocationName || "Vị trí hiện tại");
      setShowLocationInput(true);
    } catch {
      Alert.alert(
        "Không thể lấy vị trí",
        "Vui lòng thử lại hoặc nhập vị trí thủ công.",
      );
      setShowLocationInput(true);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const removeLink = () => {
    setLink("");
    setShowLinkInput(false);
  };

  const removeLocation = () => {
    setLocationName("");
    setLatitude(undefined);
    setLongitude(undefined);
    setShowLocationInput(false);
  };

  const submitPost = () => {
    if (!canSubmit) return;

    onSubmit({
      content: body.trim(),
      files: imageUris,
      latitude,
      link,
      locationName,
      longitude,
      post: "",
      visibility,
      mentionUserIds: activeMentionIds(body, mentions),
    });
  };

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
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
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Pressable
                accessibilityLabel="Đóng hộp tạo bài viết"
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={onClose}
                style={[
                  styles.headerIconButton,
                  isSubmitting && styles.controlDisabled,
                ]}
              >
                <Ionicons color={colors.text} name="close" size={22} />
              </Pressable>
              <Text style={styles.title}>Tạo bài viết</Text>
              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={submitPost}
                style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.submit}>Đăng</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.visibilityRow}>
              {[
                { icon: "earth-outline", label: "Công khai", value: 0 },
                { icon: "people-outline", label: "Theo dõi", value: 1 },
                { icon: "lock-closed-outline", label: "Riêng tư", value: 2 },
              ].map((item) => {
                const selected = visibility === item.value;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={isSubmitting}
                    key={item.value}
                    onPress={() => setVisibility(item.value)}
                    style={[
                      styles.visibilityButton,
                      selected && styles.visibilityButtonActive,
                      isSubmitting && styles.controlDisabled,
                    ]}
                  >
                    <Ionicons
                      color={selected ? colors.primary : colors.textMuted}
                      name={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
                      size={14}
                    />
                    <Text
                      style={[
                        styles.visibilityText,
                        selected && styles.visibilityTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              autoFocus
              editable={!isSubmitting}
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
            <MentionSuggestions
              onSelect={(user: MentionUser) => {
                setBody((value) => insertMention(value, user));
                setMentions((current) =>
                  current.some((item) => item.userId === user.id)
                    ? current
                    : [...current, { userId: user.id, displayName: user.displayName }],
                );
              }}
              value={body}
            />

            {showLinkInput && (
              <View style={styles.attachmentCard}>
                <View style={styles.attachmentIcon}>
                  <Ionicons color={colors.primary} name="link" size={18} />
                </View>
                <TextInput
                  accessibilityLabel="Link"
                  autoCapitalize="none"
                  editable={!isSubmitting}
                  onChangeText={setLink}
                  placeholder="Dán link vào đây"
                  placeholderTextColor={colors.textMuted}
                  style={styles.attachmentInput}
                  value={link}
                />
                <Pressable
                  accessibilityLabel="Xóa link"
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  hitSlop={8}
                  onPress={removeLink}
                  style={styles.removeAttachmentButton}
                >
                  <Ionicons color={colors.textMuted} name="close" size={18} />
                </Pressable>
              </View>
            )}

            {showLocationInput && locationName.trim().length > 0 && (
              <View style={styles.attachmentCard}>
                <View style={styles.attachmentIcon}>
                  <Ionicons color={colors.primary} name="location" size={18} />
                </View>
                <View style={styles.attachmentContent}>
                  <Text style={styles.attachmentLabel}>Vị trí</Text>
                  <Text numberOfLines={2} style={styles.attachmentText}>
                    {locationName}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Xóa vị trí"
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  hitSlop={8}
                  onPress={removeLocation}
                  style={styles.removeAttachmentButton}
                >
                  <Ionicons color={colors.textMuted} name="close" size={18} />
                </Pressable>
              </View>
            )}

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
                      <ViewableImage
                        accessibilityLabel={`Ảnh đã chọn ${index + 1}`}
                        contentFit="cover"
                        source={{ uri: normalizeFeedImageUri(uri) }}
                        style={styles.preview}
                      />
                      <Pressable
                        accessibilityLabel={`Bỏ ảnh đã chọn ${index + 1}`}
                        accessibilityRole="button"
                        disabled={isSubmitting}
                        hitSlop={8}
                        onPress={() => onRemoveImage(index)}
                        style={styles.removeImageButton}
                      >
                        <Ionicons color={colors.visuals.hex_ffffff} name="close" size={18} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

          </ScrollView>
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom + spacing.md, spacing.xl) },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || imageUris.length >= 4}
              onPress={() => {
                inputRef.current?.blur();
                Keyboard.dismiss();
                onPickImage();
              }}
              style={[
                styles.footerButton,
                (isSubmitting || imageUris.length >= 4) &&
                  styles.footerButtonDisabled,
              ]}
            >
              <View style={[styles.footerIconWrap, styles.photoIconWrap]}>
                <Ionicons color={colors.visuals.hex_00B140} name="image" size={19} />
              </View>
              <Text style={styles.footerButtonText}>Ảnh {imageUris.length}/4</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => setShowLinkInput((current) => !current)}
              style={[
                styles.footerButton,
                isSubmitting && styles.footerButtonDisabled,
              ]}
            >
              <View style={[styles.footerIconWrap, styles.linkIconWrap]}>
                <Ionicons color={colors.visuals.hex_0068FF} name="link" size={19} />
              </View>
              <Text style={styles.footerButtonText}>Link</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || isGettingLocation}
              onPress={addCurrentLocation}
              style={[
                styles.footerButton,
                (isSubmitting || isGettingLocation) &&
                  styles.footerButtonDisabled,
              ]}
            >
              <View style={[styles.footerIconWrap, styles.locationIconWrap]}>
                <Ionicons color={colors.visuals.hex_0068FF} name="location" size={19} />
              </View>
              <Text style={styles.footerButtonText}>
                {isGettingLocation ? "Đang lấy..." : "Vị trí"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      {isSubmitting && (
        <View
          accessibilityLabel="Đang đăng bài viết"
          accessibilityRole="progressbar"
          accessibilityViewIsModal
          style={styles.submittingOverlay}
        >
          <View style={styles.submittingPanel}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.submittingTitle}>Đang đăng bài viết</Text>
            <Text style={styles.submittingText}>
              Vui lòng chờ, không thoát khỏi màn hình này.
            </Text>
          </View>
        </View>
      )}
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    backgroundColor: colors.visuals.rgb_2_7_18_0_72,
    flex: 1,
    justifyContent: "flex-end",
  },
  attachmentCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attachmentContent: { flex: 1 },
  attachmentIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  attachmentInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 36,
    padding: 0,
  },
  attachmentLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  attachmentText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  controlDisabled: { opacity: 0.45 },
  footerButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  footerButtonDisabled: { opacity: 0.55 },
  footerButtonText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  footerIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  linkIconWrap: { backgroundColor: colors.primarySoft },
  locationIconWrap: { backgroundColor: colors.primarySoft },
  photoIconWrap: { backgroundColor: colors.primarySoft },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 4,
    marginTop: spacing.sm,
    width: 42,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 26,
    minHeight: 150,
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
    backgroundColor: colors.visuals.rgb_5_10_20_0_82,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: spacing.xs,
    top: spacing.xs,
    width: 28,
  },
  removeAttachmentButton: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  scrollContent: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: "92%",
    overflow: "hidden",
  },
  singleTile: { height: 220 },
  submit: { color: colors.primaryContrast, fontSize: 15, fontWeight: "900" },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 68,
    paddingHorizontal: spacing.md,
    shadowColor: colors.glow,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  submitDisabled: { opacity: 0.42 },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_2_7_18_0_66,
    justifyContent: "center",
    padding: spacing.xl,
    zIndex: 20,
  },
  submittingPanel: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primary,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 320,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    shadowColor: colors.glow,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    width: "100%",
  },
  submittingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  submittingTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  title: { ...typography.title, color: colors.text, fontSize: 18 },
  visibilityButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  visibilityButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  visibilityText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  visibilityTextActive: { color: colors.primary },
  wideTile: { height: 190, width: "100%" },
});
