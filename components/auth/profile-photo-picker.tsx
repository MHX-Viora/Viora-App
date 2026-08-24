import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ViewableImage } from "@/components/common/viewable-image";
import { spacing } from "@/theme";
import { type AppTheme, useTheme } from "@/theme";


export function ProfilePhotoPicker({
  avatarUri,
  coverUri,
  onAvatarChange,
  onCoverChange,
}: {
  avatarUri?: string;
  coverUri?: string;
  onAvatarChange: (uri: string) => void;
  onCoverChange: (uri: string) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const pickImage = async (
    options: Pick<ImagePicker.ImagePickerOptions, "allowsEditing" | "aspect">,
    onSelected: (uri: string) => void,
  ) => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập",
          "Hãy cho phép ANKT truy cập thư viện để chọn ảnh hồ sơ.",
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      ...options,
    });
    if (!result.canceled) onSelected(result.assets[0].uri);
  };

  const pickAvatar = () =>
    pickImage({ allowsEditing: true, aspect: [1, 1] }, onAvatarChange);
  const pickCover = () =>
    pickImage({ allowsEditing: false }, onCoverChange);

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityLabel={coverUri ? "Thay ảnh bìa" : "Chọn ảnh bìa"}
        accessibilityRole="button"
        onPress={pickCover}
        style={({ pressed }) => [
          styles.coverPlaceholder,
          pressed && styles.pressed,
        ]}
      >
        {coverUri ? (
          <ViewableImage
            accessibilityLabel="Ảnh bìa đã chọn"
            contentFit="cover"
            source={{ uri: coverUri }}
            style={styles.coverImage}
          />
        ) : (
          <Ionicons color={colors.textMuted} name="image-outline" size={34} />
        )}
        <View style={styles.coverEditBadge}>
          <Ionicons color={colors.white} name="camera" size={15} />
          <Text style={styles.coverEditText}>
            {coverUri ? "Thay ảnh bìa" : "Thêm ảnh bìa"}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={
          avatarUri ? "Thay ảnh đại diện" : "Chọn ảnh đại diện"
        }
        accessibilityRole="button"
        onPress={pickAvatar}
        style={({ pressed }) => [
          styles.avatarButton,
          pressed && styles.pressed,
        ]}
      >
        {avatarUri ? (
          <ViewableImage
            accessibilityLabel="Ảnh đại diện đã chọn"
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
          />
        ) : (
          <Ionicons color={colors.textMuted} name="person-outline" size={50} />
        )}
        <View style={styles.cameraBadge}>
          <Ionicons color={colors.primaryContrast} name="camera" size={18} />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={pickAvatar}
        style={({ pressed }) => pressed && styles.photoLabelPressed}
      >
        <Text style={styles.addPhotoText}>
          {avatarUri ? "Thay ảnh đại diện" : "Thêm ảnh đại diện"}
        </Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) => {
  const { colors, effects } = theme;

  return StyleSheet.create({
  addPhotoText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  avatarButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surface,
    borderRadius: 50,
    borderWidth: 4,
    height: 100,
    justifyContent: "center",
    marginTop: -50,
    ...effects.shadow,
    width: 100,
  },
  avatarImage: { borderRadius: 46, height: 92, width: 92 },
  cameraBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 15,
    borderWidth: 3,
    bottom: 0,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 30,
  },
  coverPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: Math.min(effects.cardRadius, 16),
    borderWidth: 1,
    height: 170,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  coverEditBadge: {
    alignItems: "center",
    backgroundColor: colors.overlay,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
  },
  coverEditText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  coverImage: { height: "100%", width: "100%" },
  photoLabelPressed: { opacity: 0.72 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  section: { alignItems: "center", gap: spacing.md },
  });
};
