import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/theme";
import { formatNotificationTime } from "@/utils/notification-time";
import { type ThemeColors, useTheme } from "@/theme";


const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export function NotificationDetailScreen() {
  const { theme } = useTheme();
  const colors = theme.notifications;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    avatarUrl?: string | string[];
    content?: string | string[];
    createdAt?: string | string[];
    imageUrl?: string | string[];
    senderName?: string | string[];
    title?: string | string[];
  }>();
  const avatarUrl = firstParam(params.avatarUrl);
  const imageUrl = firstParam(params.imageUrl);
  const senderName = firstParam(params.senderName) || "Hệ thống ANKT";
  const title = firstParam(params.title) || "Thông báo";

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color={colors.text} name="chevron-back" size={25} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          Chi tiết thông báo
        </Text>
        <View style={styles.headerBalance} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.senderRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons color={colors.primary} name="shield-checkmark" size={25} />
              </View>
            )}
            <View style={styles.senderInfo}>
              <Text numberOfLines={1} style={styles.senderName}>
                {senderName}
              </Text>
              <Text style={styles.time}>
                {formatNotificationTime(firstParam(params.createdAt))}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{firstParam(params.content)}</Text>

          {imageUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: imageUrl }}
              style={styles.image}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: {
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    width: 56,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.borderRead,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  headerBalance: { width: 40 },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  image: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    width: "100%",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  senderInfo: { flex: 1, gap: 3 },
  senderName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  senderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 27,
  },
});
