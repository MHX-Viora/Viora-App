import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UserAvatar } from "@/components/common/user-avatar";
import { spacing, useTheme } from "@/theme";
import type { AdvertisementCtaType } from "@/types/advertisement";
import type { Reel } from "@/types/reel";
import { advertisementCtaLabel } from "@/utils/advertisement-format";

const ACTIONS = [
  { icon: "heart", label: "Thích reels", size: 36, count: true },
  { icon: "chatbubble", label: "Bình luận reels", size: 30, count: true },
  { icon: "paper-plane-outline", label: "Chia sẻ reels", size: 24, count: false },
  { icon: "bookmark-outline", label: "Lưu reels", size: 24, count: false },
] as const;

export function ReelAdvertisementPreview({ reel, ctaType }: { reel: Reel; ctaType: AdvertisementCtaType }) {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => StyleSheet.create({
    frame: { alignSelf: "center", aspectRatio: 9 / 16, backgroundColor: colors.reelBackground, borderRadius: 14, maxWidth: 420, overflow: "hidden", width: "100%" },
    shade: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.visuals.rgb_0_0_0_0_34 },
    content: { bottom: spacing.md, left: spacing.md, position: "absolute", right: spacing.md, gap: spacing.sm },
    bottomContent: { alignItems: "flex-end", flexDirection: "row" },
    copy: { flex: 1, paddingBottom: spacing.xs, paddingRight: spacing.md },
    authorLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
    avatarWrap: { marginBottom: spacing.sm },
    avatar: { borderColor: colors.primary, borderRadius: 24, borderWidth: 1 },
    follow: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, bottom: -6, height: 20, justifyContent: "center", left: 14, position: "absolute", width: 20 },
    authorCopy: { flex: 1 },
    author: { color: colors.white, fontSize: 18, fontWeight: "800" },
    sponsored: { color: colors.visuals.rgb_255_255_255_0_86, fontSize: 11, fontWeight: "700" },
    sponsoredLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
    caption: { color: colors.white, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
    hashtags: { color: colors.white, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
    more: { color: colors.white, fontSize: 13, fontWeight: "700", marginTop: spacing.xs },
    rail: { alignItems: "center", gap: spacing.sm, width: 60 },
    action: { alignItems: "center" },
    icon: { alignItems: "center", height: 46, justifyContent: "center", width: 46 },
    count: { color: colors.white, fontSize: 10, fontWeight: "600", lineHeight: 14, marginTop: -5 },
    cta: { alignItems: "center", backgroundColor: colors.visuals.rgb_0_0_0_0_54, borderColor: colors.visuals.rgb_255_255_255_0_24, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
    ctaText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  }), [colors]);

  return (
    <View accessibilityLabel="Bản xem trước quảng cáo Reels" style={styles.frame}>
      <Image contentFit="contain" source={{ uri: reel.thumbnailUrl }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.shade} />
      <View pointerEvents="none" style={styles.content}>
        <View style={styles.bottomContent}>
          <View style={styles.copy}>
            <View style={styles.authorLine}>
              <View style={styles.authorCopy}>
                <Pressable accessibilityRole="button" disabled>
                  <Text numberOfLines={1} style={styles.author}>{reel.author}</Text>
                </Pressable>
                <View style={styles.sponsoredLine}>
                  <Ionicons color={colors.visuals.rgb_255_255_255_0_86} name="megaphone-outline" size={12} />
                  <Text style={styles.sponsored}>Được tài trợ</Text>
                </View>
              </View>
              {reel.isAuthorVerified ? <Ionicons accessibilityLabel="Tài khoản đã xác minh" color={colors.primary} name="checkmark-circle" size={16} /> : null}
            </View>
            <Text numberOfLines={2} style={styles.caption}>{reel.caption}</Text>
            {reel.hashtags ? <Text numberOfLines={2} style={styles.hashtags}>{reel.hashtags}</Text> : null}
            {reel.caption.length > 70 || reel.hashtags.length > 45 ? <Pressable accessibilityRole="button" disabled><Text style={styles.more}>Xem thêm</Text></Pressable> : null}
            <Pressable accessibilityLabel={`${advertisementCtaLabel(ctaType)} quảng cáo`} accessibilityRole="button" disabled style={styles.cta}>
              <Text numberOfLines={1} style={styles.ctaText}>{advertisementCtaLabel(ctaType)}</Text>
              <Ionicons color={colors.white} name="chevron-forward" size={18} />
            </Pressable>
          </View>
          <View style={styles.rail}>
            <View style={styles.avatarWrap}>
              <Pressable accessibilityLabel={`Trang của ${reel.author}`} accessibilityRole="button" disabled>
                <UserAvatar displayName={reel.author} imageUrl={reel.avatar} size={48} style={styles.avatar} />
              </Pressable>
              <Pressable accessibilityLabel="Theo dõi người đăng" accessibilityRole="button" disabled style={styles.follow}>
                <Ionicons color={colors.white} name="add" size={14} />
              </Pressable>
            </View>
            {ACTIONS.map(({ icon, label, size, count }) => (
              <View key={icon} style={styles.action}>
                <Pressable accessibilityLabel={label} accessibilityRole="button" disabled style={styles.icon}>
                  <Ionicons color={colors.white} name={icon} size={size} />
                </Pressable>
                {count ? <Text style={styles.count}>999</Text> : null}
              </View>
            ))}
          </View>
        </View>

      </View>
    </View>
  );
}
