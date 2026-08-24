import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { spacing, type ThemeColors, useTheme } from "@/theme";

type TmiSponsorProps = {
  style?: StyleProp<ViewStyle>;
};

export function TmiSponsor({ style }: TmiSponsorProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <View style={[styles.container, style]}>
      <Image
        accessibilityLabel="Logo CNS"
        contentFit="contain"
        source={require("../../assets/images/tmi-cns-logo.png")}
        style={styles.logo}
      />
      <Text style={styles.text}>Phát triển và bảo trợ bởi TMI</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { alignItems: "center", gap: spacing.xs },
    logo: { height: 58, width: 64 },
    text: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  });
