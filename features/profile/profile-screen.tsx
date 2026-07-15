import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ProfileContent } from "@/components/profile/profile-content";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileOverview } from "@/components/profile/profile-overview";
import { ProfileQrModal } from "@/components/profile/profile-qr-modal";
import { ProfileSettingsSheet } from "@/components/profile/profile-settings-sheet";
import { profile } from "@/features/profile/data";
import { logout } from "@/services/auth.service";
import { clearSession, getSession } from "@/stores/session-store";
import { colors } from "@/theme";
import type { User } from "@/types/auth";

export function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const session = await getSession();

      // Không có session thì quay lại login.
      if (!session?.accessToken) {
        router.replace("/login");
        return;
      }

      // Có token nhưng chưa có user thì quay lại bước hoàn thiện hồ sơ.
      if (session.user === null) {
        router.replace("/complete-profile");
        return;
      }

      setUser(session.user);
      setIsLoading(false);
    };

    loadUser();
  }, []);

  if (isLoading || user === null) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  const profileName = user.displayName;
  const profileAvatar = user.avatarUrl;
  const profileCover = user.coverUrl;

  const username = user.displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

  const profileHandle = `@${username}`;

  return (
    <View style={styles.screen}>
      <ProfileHeader
        onOpenFriends={() => router.push("/friends")}
        onOpenQr={() => setShowQr(true)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileOverview
          avatar={profileAvatar}
          cover={profileCover}
          handle={profileHandle}
          name={profileName}
          onEdit={() => router.push("/edit-profile")}
        />
        <ProfileContent stats={profile.stats} />
      </ScrollView>
      <ProfileQrModal
        avatar={profileAvatar}
        handle={profileHandle}
        name={profileName}
        onClose={() => setShowQr(false)}
        qrValue={`viora://profile/${user.id}`}
        visible={showQr}
      />
      <ProfileSettingsSheet
        onClose={() => setShowSettings(false)}
        onLogout={async () => {
          setShowSettings(false);
          try {
            await logout();
          } catch {
            // Dù API logout lỗi, vẫn xoá session local để người dùng thoát app.
          }
          await clearSession();
          router.replace("/login");
        }}
        visible={showSettings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.surface, flexGrow: 1 },
  loading: {
    alignItems: "center",
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: "center",
  },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  screen: { backgroundColor: colors.surface, flex: 1 },
});
