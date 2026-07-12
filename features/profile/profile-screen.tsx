import { useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { ProfileContent } from "@/components/profile/profile-content";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileOverview } from "@/components/profile/profile-overview";
import { ProfileQrModal } from "@/components/profile/profile-qr-modal";
import { ProfileSettingsSheet } from "@/components/profile/profile-settings-sheet";
import { profile } from "@/features/profile/data";
import { colors } from "@/theme";

export function ProfileScreen() {
  const [showQr, setShowQr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
          avatar={profile.avatar}
          cover={profile.cover}
          handle={profile.handle}
          name={profile.name}
        />
        <ProfileContent stats={profile.stats} />
      </ScrollView>
      <ProfileQrModal
        avatar={profile.avatar}
        handle={profile.handle}
        name={profile.name}
        onClose={() => setShowQr(false)}
        qrValue={profile.qrValue}
        visible={showQr}
      />
      <ProfileSettingsSheet
        onClose={() => setShowSettings(false)}
        visible={showSettings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.surface, flexGrow: 1 },
  screen: { backgroundColor: colors.surface, flex: 1 },
});
