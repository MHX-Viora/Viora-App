import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useResponsive } from "@/hooks/use-responsive";
import { getResponsiveContentLayout } from "@/components/layout/responsive-layout";

type ResponsiveContentProps = PropsWithChildren<{
  maxWidth: number;
  style?: StyleProp<ViewStyle>;
}>;

export function ResponsiveContent({
  children,
  maxWidth,
  style,
}: ResponsiveContentProps) {
  const { isDesktopWeb } = useResponsive();

  return (
    <View
      style={[
        styles.container,
        getResponsiveContentLayout({ isDesktopWeb, maxWidth }),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
});
