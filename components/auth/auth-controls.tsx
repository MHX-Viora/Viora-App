import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


type AuthFieldProps = Pick<
  TextInputProps,
  | "autoCapitalize"
  | "autoComplete"
  | "keyboardType"
  | "onChangeText"
  | "onSubmitEditing"
  | "returnKeyType"
  | "textContentType"
  | "value"
> & {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  placeholder: string;
  secure?: boolean;
};

export function AuthField({
  icon,
  label,
  placeholder,
  secure = false,
  ...inputProps
}: AuthFieldProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <Ionicons color={colors.textMuted} name={icon} size={21} />
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure && !passwordVisible}
          style={styles.input}
          {...inputProps}
        />
        {secure && (
          <Pressable
            accessibilityLabel={passwordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setPasswordVisible((current) => !current)}
          >
            <Ionicons
              color={colors.textMuted}
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function AuthPrimaryButton({
  disabled = false,
  isLoading = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, disabled: disabled || isLoading }}
      disabled={disabled || isLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        (disabled || isLoading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.primaryContrast} />
      ) : (
        <>
          <Text style={styles.primaryButtonText}>{label}</Text>
          <Ionicons color={colors.primaryContrast} name="arrow-forward" size={22} />
        </>
      )}
    </Pressable>
  );
}

export function AuthFooterLink({
  action,
  onPress,
  prompt,
}: {
  action: string;
  onPress: () => void;
  prompt: string;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.footerRow}>
      <Text style={styles.footerText}>{prompt} </Text>
      <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
        <Text style={styles.footerLink}>{action}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  disabled: { opacity: 0.58 },
  field: {
    alignItems: "center",
    backgroundColor: colors.visuals.rgb_9_23_41_0_70,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  fieldGroup: { gap: spacing.xs },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerText: { color: colors.textMuted, fontSize: 14 },
  input: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 12 },
  label: { color: colors.text, fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.82 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 24,
    borderColor: colors.visuals.rgb_255_255_255_0_20,
    borderWidth: 1,
    elevation: 3,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
  },
  primaryButtonText: {
    color: colors.primaryContrast,
    fontSize: 16,
    fontWeight: "900",
  },
});
