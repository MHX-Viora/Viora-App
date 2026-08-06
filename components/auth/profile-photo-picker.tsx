import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ViewableImage } from "@/components/common/viewable-image";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


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
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        style={styles.coverPlaceholder}
      >
        {coverUri ? (
          <ViewableImage
            accessibilityLabel="Ảnh bìa đã chọn"
            contentFit="cover"
            source={{ uri: coverUri }}
            style={styles.coverImage}
          />
        ) : (
          <Ionicons color={colors.visuals.hex_7A8496} name="image-outline" size={34} />
        )}
        <View style={styles.coverEditBadge}>
          <Ionicons color={colors.white} name="camera" size={15} />
          <Text style={styles.coverEditText}>
            {coverUri ? "Thay ảnh bìa" : "Thêm ảnh bìa"}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Chọn ảnh đại diện"
        accessibilityRole="button"
        onPress={pickAvatar}
        style={styles.avatarButton}
      >
        {avatarUri ? (
          <ViewableImage
            accessibilityLabel="Ảnh đại diện đã chọn"
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
          />
        ) : (
          <Ionicons color={colors.visuals.hex_60758B} name="person-outline" size={56} />
        )}
        <View style={styles.cameraBadge}>
          <Ionicons color={colors.white} name="camera" size={18} />
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={pickAvatar}>
        <Text style={styles.addPhotoText}>
          {avatarUri ? "Thay ảnh đại diện" : "Thêm ảnh đại diện"}
        </Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  addPhotoText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  avatarButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.white,
    borderRadius: 52,
    borderWidth: 8,
    height: 104,
    justifyContent: "center",
    marginTop: -52,
    shadowColor: colors.visuals.hex_6D7890,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    width: 104,
  },
  avatarImage: { borderRadius: 44, height: 88, width: 88 },
  cameraBadge: {
    alignItems: "center",
    backgroundColor: colors.visuals.hex_0868D9,
    borderColor: colors.white,
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
    backgroundColor: colors.visuals.hex_DCE8FF,
    borderRadius: 10,
    height: 170,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  coverEditBadge: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_15_23_42_0_72,
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
  section: { alignItems: "center", gap: spacing.md },
});
