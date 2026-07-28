import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { UtilityGrid } from "@/components/utilities/utility-grid";
import { WeatherCard } from "@/components/utilities/weather-card";
import { utilityItems } from "@/features/utilities/data";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function UtilitiesScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WeatherCard />
        <UtilityGrid items={utilityItems} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    paddingTop: 40,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
});
