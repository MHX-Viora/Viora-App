import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const hostColors = {
  background: "#091725",
  surface: "#102235",
  surfaceRaised: "#162B40",
  border: "#28425B",
  text: "#F6F9FC",
  muted: "#9CB0C3",
  cyan: "#29BED8",
  purple: "#9253EC",
  pink: "#F74369",
  green: "#56DBA1",
  yellow: "#FFD36B",
} as const;

export function HostButton({ label, onPress, icon, variant = "primary", disabled = false, style }: {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: object;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, variant === "primary" && styles.primary, variant === "secondary" && styles.secondary, variant === "danger" && styles.danger, disabled && styles.disabled, pressed && styles.pressed, style]}>
    {icon ? <Ionicons color={hostColors.text} name={icon} size={18} /> : null}
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

export function HostIconButton({ icon, label, onPress, active = false, danger = false, compact = false, small = false }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  compact?: boolean;
  small?: boolean;
}) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.iconButton, compact && styles.iconButtonCompact, small && styles.iconButtonSmall, active && styles.iconActive, danger && styles.iconDanger, pressed && styles.pressed]}>
    <Ionicons color={hostColors.text} name={icon} size={small ? 15 : compact ? 17 : 20} />
    <Text numberOfLines={small ? 2 : 1} style={[styles.iconLabel, compact && styles.iconLabelCompact, small && styles.iconLabelSmall]}>{label}</Text>
  </Pressable>;
}

export function HostPanel({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function HostHeading({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return <View style={styles.heading}>
    {onBack ? <Pressable accessibilityLabel="Quay lại" accessibilityRole="button" onPress={onBack} style={styles.back}><Ionicons color={hostColors.text} name="arrow-back" size={22} /></Pressable> : null}
    <View style={styles.headingText}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>
  </View>;
}

const styles = StyleSheet.create({
  button: { alignItems: "center", borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48, paddingHorizontal: 18 },
  primary: { backgroundColor: hostColors.purple },
  secondary: { backgroundColor: hostColors.surfaceRaised, borderColor: hostColors.border, borderWidth: 1 },
  danger: { backgroundColor: hostColors.pink },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.72 },
  buttonText: { color: hostColors.text, fontSize: 14, fontWeight: "800" },
  iconButton: { alignItems: "center", backgroundColor: "rgba(14, 31, 48, 0.92)", borderColor: hostColors.border, borderRadius: 12, borderWidth: 1, flex: 1, gap: 5, justifyContent: "center", minHeight: 64, minWidth: 62, paddingHorizontal: 7 },
  iconButtonCompact: { borderRadius: 10, gap: 3, minHeight: 52, minWidth: 54, paddingHorizontal: 6 },
  iconButtonSmall: { flex: 1, gap: 1, minHeight: 44, minWidth: 0, paddingHorizontal: 1 },
  iconActive: { borderColor: hostColors.cyan },
  iconDanger: { backgroundColor: hostColors.pink, borderColor: hostColors.pink },
  iconLabel: { color: hostColors.text, fontSize: 10, fontWeight: "700" },
  iconLabelCompact: { fontSize: 9 },
  iconLabelSmall: { fontSize: 8, lineHeight: 9, textAlign: "center" },
  panel: { backgroundColor: hostColors.surface, borderColor: hostColors.border, borderRadius: 16, borderWidth: 1 },
  heading: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 52 },
  back: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  headingText: { flex: 1 },
  title: { color: hostColors.text, fontSize: 21, fontWeight: "800" },
  subtitle: { color: hostColors.muted, fontSize: 12, marginTop: 3 },
});
