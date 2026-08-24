import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { VerifiedBadge } from "@/components/common/verified-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { getFriends } from "@/services/friend.service";
import { layout, spacing, type ThemeColors, useTheme } from "@/theme";
import type { FriendListItem } from "@/types/friend";

const FRIEND_PREVIEW_SIZE = 8;

export function ProfileDesktopSidebar({
  onOpenFriend,
  onOpenFriends,
  onOpenQr,
}: {
  onOpenFriend: (userId: string) => void;
  onOpenFriends: () => void;
  onOpenQr: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      setIsLoading(true);
      try {
        const response = await getFriends({
          page: 1,
          pageSize: FRIEND_PREVIEW_SIZE,
          status: "Accepted",
        });
        if (!active) return;
        setFriends(response.items);
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setFriends([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách bạn bè.",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadPreview();
    return () => {
      active = false;
    };
  }, [retryNonce]);

  return (
    <View style={styles.sidebar}>
      <View style={styles.actions}>
        <SidebarAction
          icon="people-outline"
          label="Bạn bè"
          onPress={onOpenFriends}
        />
        <SidebarAction
          icon="qr-code-outline"
          label="Mã QR"
          onPress={onOpenQr}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bạn bè</Text>
        <Pressable accessibilityRole="button" onPress={onOpenFriends}>
          <Text style={styles.seeAll}>Xem tất cả</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryNonce((current) => current + 1)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.stateWrap}>
          <Ionicons color={colors.textMuted} name="people-outline" size={30} />
          <Text style={styles.stateText}>Chưa có bạn bè.</Text>
        </View>
      ) : (
        <View style={styles.friendList}>
          {friends.map((friend) => (
            <Pressable
              accessibilityLabel={`Xem hồ sơ ${friend.user.displayName}`}
              accessibilityRole="button"
              key={friend.friendshipId}
              onPress={() => onOpenFriend(friend.user.id)}
              style={({ pressed }) => [
                styles.friendRow,
                pressed && styles.pressed,
              ]}
            >
              <UserAvatar
                displayName={friend.user.displayName}
                imageUrl={friend.user.avatarUrl}
                size={40}
                style={styles.avatar}
              />
              <View style={styles.friendInfo}>
                <View style={styles.friendNameRow}>
                  <Text numberOfLines={1} style={styles.friendName}>
                    {friend.user.displayName}
                  </Text>
                  {friend.user.isVerified && <VerifiedBadge size={14} />}
                </View>
                {friend.user.mutualFriendCount > 0 && (
                  <Text style={styles.mutualText}>
                    {friend.user.mutualFriendCount} bạn chung
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function SidebarAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons color={theme.colors.primary} name={icon} size={22} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    actionButton: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: 10,
      flex: 1,
      gap: spacing.xs,
      minHeight: 72,
      justifyContent: "center",
    },
    actionLabel: { color: colors.text, fontSize: 13, fontWeight: "800" },
    actions: { flexDirection: "row", gap: spacing.sm },
    avatar: { borderRadius: 20, height: 40, width: 40 },
    avatarFallback: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: 20,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    friendInfo: { flex: 1, minWidth: 0 },
    friendList: { gap: spacing.xs },
    friendName: {
      color: colors.text,
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "800",
    },
    friendNameRow: { alignItems: "center", flexDirection: "row", gap: 4 },
    friendRow: {
      alignItems: "center",
      borderRadius: 9,
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.xs,
    },
    mutualText: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    pressed: { opacity: 0.74 },
    retryButton: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    retryText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.lg,
    },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
    seeAll: { color: colors.primary, fontSize: 12, fontWeight: "800" },
    sidebar: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      borderWidth: 1,
      padding: spacing.md,
      width: layout.profileFriendsSidebarWidth,
    },
    stateText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
    stateWrap: {
      alignItems: "center",
      gap: spacing.sm,
      justifyContent: "center",
      minHeight: 120,
      paddingVertical: spacing.md,
    },
  });
