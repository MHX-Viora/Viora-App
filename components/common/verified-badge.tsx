import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useTheme } from "@/theme";

export function VerifiedBadge({ accessibilityLabel = "Tài khoản đã xác minh", size = 16 }: { accessibilityLabel?: string; size?: number }) {
  const { theme } = useTheme();

  return (
    <MaterialIcons
      accessibilityLabel={accessibilityLabel}
      color={theme.colors.verified}
      name="verified"
      size={size}
    />
  );
}
