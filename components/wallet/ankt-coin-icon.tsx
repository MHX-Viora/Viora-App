import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

type Props = { size?: number };

export function AnktCoinIcon({ size = 28 }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    coin: {
      alignItems: "center", backgroundColor: theme.wallet.coinBackground,
      borderColor: theme.wallet.coinBorder, borderRadius: size / 2, borderWidth: Math.max(1, size / 18),
      height: size, justifyContent: "center", width: size,
    },
    label: { color: theme.wallet.coinText, fontSize: Math.max(6, size * 0.24), fontWeight: "900", letterSpacing: -0.4 },
  }), [size, theme.wallet]);
  return <View accessibilityLabel="ANKT coin" style={styles.coin}><Text style={styles.label}>ANKT</Text></View>;
}
