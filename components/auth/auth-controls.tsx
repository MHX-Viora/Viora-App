import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { colors, spacing } from "@/theme";

type AuthFieldProps = Pick<
  TextInputProps,
  "autoCapitalize" | "autoComplete" | "keyboardType" | "onChangeText" | "value"
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
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Text style={styles.primaryButtonText}>{label}</Text>
          <Ionicons color={colors.white} name="arrow-forward" size={22} />
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
  return (
    <View style={styles.footerRow}>
      <Text style={styles.footerText}>{prompt} </Text>
      <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
        <Text style={styles.footerLink}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.58 },
  field: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#CBD3E1",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  fieldGroup: { gap: spacing.xs },
  footerLink: { color: "#0B3AA4", fontSize: 14, fontWeight: "800" },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerText: { color: colors.text, fontSize: 14 },
  input: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 12 },
  label: { color: colors.text, fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.82 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1239A6",
    borderRadius: 24,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
});
