import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { spacing, type ThemeColors, useTheme } from "@/theme";

const people = ["K", "H", "Q", "T"];

export function AppShowcase({ compact = false }: { compact?: boolean }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.stage, compact && styles.stageCompact]}
    >
      <View style={styles.orbit} />
      <View style={[styles.phone, compact && styles.phoneCompact]}>
        <View style={styles.phoneTop}>
          <View style={styles.brand}>
            <Image
              contentFit="cover"
              source={require("../../assets/images/viora_logo.png")}
              style={styles.logo}
            />
            <Text style={styles.brandText}>ANKT</Text>
          </View>
          <Ionicons color={theme.colors.text} name="notifications-outline" size={19} />
        </View>

        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.eyebrow}>CHÀO BUỔI SÁNG</Text>
            <Text style={styles.welcome}>Kika 👋</Text>
          </View>
          <View style={styles.profileAvatar}><Text style={styles.profileInitial}>K</Text></View>
        </View>

        <View style={styles.storyRow}>
          {people.map((person, index) => (
            <View key={person} style={styles.storyItem}>
              <View style={[styles.storyRing, index === 0 && styles.storyRingActive]}>
                <Text style={styles.storyInitial}>{person}</Text>
              </View>
              <Text style={styles.storyName}>{index === 0 ? "Bạn" : person}</Text>
            </View>
          ))}
        </View>

        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.authorAvatar}><Text style={styles.authorInitial}>Q</Text></View>
            <View style={styles.authorCopy}>
              <Text style={styles.authorName}>Quyền Kaka</Text>
              <Text style={styles.postMeta}>Công khai · Vừa xong</Text>
            </View>
            <Ionicons color={theme.colors.textMuted} name="ellipsis-horizontal" size={19} />
          </View>
          <Text style={styles.postText}>Một ngày mới, một câu chuyện mới cùng ANKT.</Text>
          <View style={styles.postMedia}>
            <View style={styles.mediaGlow} />
            <Ionicons color={theme.colors.primary} name="play" size={36} />
          </View>
          <View style={styles.postActions}>
            <Ionicons color={theme.colors.danger} name="heart" size={19} />
            <Text style={styles.actionText}>128</Text>
            <Ionicons color={theme.colors.text} name="chatbubble-outline" size={18} />
            <Text style={styles.actionText}>24</Text>
            <View style={styles.actionSpacer} />
            <Ionicons color={theme.colors.text} name="paper-plane-outline" size={19} />
          </View>
        </View>

        <View style={styles.phoneTabs}>
          {(["home", "play-circle", "chatbubble", "person"] as const).map((icon, index) => (
            <View key={icon} style={styles.tabItem}>
              <Ionicons
                color={index === 0 ? theme.colors.primary : theme.colors.textMuted}
                name={index === 0 ? icon : `${icon}-outline`}
                size={21}
              />
              {index === 0 ? <View style={styles.activeDot} /> : null}
            </View>
          ))}
        </View>
      </View>

      {!compact ? (
        <View style={styles.messageCard}>
          <View style={styles.messageIcon}>
            <Ionicons color={theme.colors.primary} name="chatbubbles" size={21} />
          </View>
          <View>
            <Text style={styles.messageTitle}>Tin nhắn mới</Text>
            <Text style={styles.messageText}>DuyLinh: Chào bạn 👋</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  actionSpacer: { flex: 1 },
  actionText: { color: colors.textMuted, fontSize: 11, marginRight: spacing.sm },
  activeDot: { backgroundColor: colors.primary, borderRadius: 2, height: 3, marginTop: 4, width: 18 },
  authorAvatar: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 17, height: 34, justifyContent: "center", width: 34 },
  authorCopy: { flex: 1 },
  authorInitial: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  authorName: { color: colors.text, fontSize: 12, fontWeight: "800" },
  brand: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  brandText: { color: colors.text, fontSize: 15, fontWeight: "900", letterSpacing: 0.8 },
  eyebrow: { color: colors.primary, fontSize: 8, fontWeight: "800", letterSpacing: 1.2 },
  logo: { borderRadius: 10, height: 24, width: 24 },
  mediaGlow: { backgroundColor: colors.primarySoft, borderRadius: 70, height: 140, position: "absolute", width: 140 },
  messageCard: { alignItems: "center", backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md, position: "absolute", right: -72, top: 112 },
  messageIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  messageText: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  messageTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  orbit: { borderColor: colors.borderSubtle, borderRadius: 260, borderWidth: 1, height: 520, position: "absolute", width: 520 },
  phone: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 34, borderWidth: 2, height: 560, overflow: "hidden", padding: spacing.lg, width: 300 },
  phoneCompact: { maxWidth: 300, width: "92%" },
  phoneTabs: { alignItems: "center", backgroundColor: colors.surface, borderTopColor: colors.borderSubtle, borderTopWidth: 1, bottom: 0, flexDirection: "row", height: 54, justifyContent: "space-around", left: 0, position: "absolute", right: 0 },
  phoneTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  postActions: { alignItems: "center", flexDirection: "row", paddingTop: spacing.md },
  postCard: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, marginTop: spacing.lg, padding: spacing.md },
  postHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  postMedia: { alignItems: "center", backgroundColor: colors.secondaryBackground, borderRadius: 12, height: 150, justifyContent: "center", marginTop: spacing.md, overflow: "hidden" },
  postMeta: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  postText: { color: colors.text, fontSize: 11, lineHeight: 16, marginTop: spacing.md },
  profileAvatar: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  profileInitial: { color: colors.primaryContrast, fontSize: 17, fontWeight: "900" },
  stage: { alignItems: "center", height: 620, justifyContent: "center", position: "relative", width: 440 },
  stageCompact: { height: 580, maxWidth: 320, width: "100%" },
  storyInitial: { color: colors.text, fontSize: 12, fontWeight: "800" },
  storyItem: { alignItems: "center", gap: 4 },
  storyName: { color: colors.textMuted, fontSize: 8 },
  storyRing: { alignItems: "center", backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: "center", width: 36 },
  storyRingActive: { borderColor: colors.primary, borderWidth: 2 },
  storyRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  tabItem: { alignItems: "center", justifyContent: "center" },
  welcome: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 3 },
  welcomeRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl },
});
