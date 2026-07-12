import { SafeAreaView, ScrollView, StyleSheet } from "react-native";

import { UtilityGrid } from "@/components/utilities/utility-grid";
import { WeatherCard } from "@/components/utilities/weather-card";
import { utilityItems } from "@/features/utilities/data";
import { colors, spacing } from "@/theme";

export function UtilitiesScreen() {
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

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    paddingTop: 40,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
});
