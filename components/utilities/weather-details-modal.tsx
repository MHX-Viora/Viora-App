import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  type CurrentWeather,
  describeWeather,
  fetchWeatherDetails,
  type WeatherDetails,
} from "@/features/utilities/weather";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function WeatherDetailsModal({
  current,
  onClose,
  visible,
}: {
  current: CurrentWeather;
  onClose: () => void;
  visible: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [details, setDetails] = useState<WeatherDetails | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setError(false);
    void fetchWeatherDetails(
      current.latitude,
      current.longitude,
      controller.signal,
    )
      .then(setDetails)
      .catch((requestError: Error) => {
        if (requestError.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [current.latitude, current.longitude, visible]);

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
    >
      <View style={styles.screen}>
        <StatusBar backgroundColor={colors.visuals.hex_4D83C6} style="light" translucent />
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={styles.content}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroHeader}>
              <Pressable
                accessibilityLabel="Đóng chi tiết thời tiết"
                accessibilityRole="button"
                hitSlop={10}
                onPress={onClose}
              >
                <Ionicons color={colors.white} name="arrow-back" size={27} />
              </Pressable>
              <Pressable
                accessibilityLabel="Tùy chọn thời tiết"
                accessibilityRole="button"
                hitSlop={10}
              >
                <Ionicons
                  color={colors.white}
                  name="ellipsis-vertical"
                  size={23}
                />
              </Pressable>
            </View>
            <Text style={styles.location}>{current.locationName}</Text>
            <Text style={styles.heroTemperature}>
              {Math.round(current.temperature)}°
            </Text>
            <Text style={styles.heroDescription}>{current.description}</Text>
            <Text style={styles.range}>
              {details
                ? `${Math.round(details.daily[0]?.max)}° / ${Math.round(details.daily[0]?.min)}°`
                : "Đang tải dự báo…"}
            </Text>
          </View>

          {!details && !error && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.loadingText}>
                Đang cập nhật dữ liệu thời tiết…
              </Text>
            </View>
          )}
          {error && (
            <View style={styles.loading}>
              <Ionicons
                color={colors.white}
                name="cloud-offline-outline"
                size={28}
              />
              <Text style={styles.loadingText}>
                Không tải được dự báo chi tiết
              </Text>
            </View>
          )}
          {details && <WeatherDetailsContent details={details} />}

          <Text style={styles.source}>Dữ liệu thời tiết từ Open-Meteo</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function WeatherDetailsContent({ details }: { details: WeatherDetails }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <>
      <View style={styles.glassCard}>
        <SectionHeader icon="calendar-outline" title="Dự báo 5 ngày" />
        {details.daily.map((day, index) => {
          const visual = describeWeather(day.code);
          return (
            <View key={day.date} style={styles.dailyRow}>
              <Text style={styles.dayLabel}>{dayLabel(day.date, index)}</Text>
              <Ionicons
                color={iconColor(visual.icon, colors)}
                name={visual.icon}
                size={23}
              />
              <Text style={styles.lowTemperature}>{Math.round(day.min)}°</Text>
              <View style={styles.temperatureBar}>
                <View style={styles.temperatureFill} />
              </View>
              <Text style={styles.highTemperature}>{Math.round(day.max)}°</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.glassCard}>
        <SectionHeader icon="time-outline" title="Dự báo 24 giờ" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.hourlyRow}>
            {details.hourly.map((hour, index) => {
              const visual = describeWeather(hour.code);
              return (
                <View key={hour.time} style={styles.hourItem}>
                  <Text style={styles.hourTemperature}>
                    {Math.round(hour.temperature)}°
                  </Text>
                  <Ionicons
                    color={iconColor(visual.icon, colors)}
                    name={visual.icon}
                    size={22}
                  />
                  <Text style={styles.windText}>
                    {Math.round(hour.windSpeed)} km/h
                  </Text>
                  <Text style={styles.hourText}>
                    {index === 0 ? "Bây giờ" : hour.time.slice(11, 16)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          icon="sunny-outline"
          label="UV"
          value={uvLabel(details.uvIndex)}
          detail={`${Math.round(details.uvIndex)}`}
        />
        <MetricCard
          icon="water-outline"
          label="Độ ẩm"
          value={`${Math.round(details.humidity)}%`}
          detail=""
        />
        <MetricCard
          icon="thermometer-outline"
          label="Cảm giác như"
          value={`${Math.round(details.apparentTemperature)}°`}
          detail=""
        />
        <MetricCard
          icon="navigate-outline"
          label="Gió"
          value={`${Math.round(details.windSpeed)} km/h`}
          detail={`${Math.round(details.windDirection)}°`}
        />
        <MetricCard
          icon="partly-sunny-outline"
          label="Hoàng hôn"
          value={details.sunset.slice(11, 16)}
          detail=""
        />
        <MetricCard
          icon="speedometer-outline"
          label="Áp suất"
          value={`${Math.round(details.pressure)}`}
          detail="hPa"
        />
      </View>
    </>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.sectionHeader}>
      <Ionicons color={colors.visuals.rgb_255_255_255_0_75} name={icon} size={17} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Ionicons color={colors.visuals.rgb_255_255_255_0_68} name={icon} size={16} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {!!detail && <Text style={styles.metricDetail}>{detail}</Text>}
    </View>
  );
}

function dayLabel(date: string, index: number) {
  if (index === 0) return "Hôm nay";
  if (index === 1) return "Ngày mai";
  const day = new Date(`${date}T12:00:00`).getDay();
  return ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"][day];
}

function uvLabel(value: number) {
  if (value < 3) return "Thấp";
  if (value < 6) return "Trung bình";
  if (value < 8) return "Cao";
  return "Rất cao";
}

function iconColor(icon: CurrentWeather["icon"], colors: ThemeColors) {
  return icon === "sunny" || icon === "partly-sunny" ? colors.visuals.hex_FFD45C : colors.visuals.hex_D9ECFF;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { paddingBottom: 34 },
  dailyRow: {
    alignItems: "center",
    borderBottomColor: colors.visuals.rgb_255_255_255_0_1,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
  },
  dayLabel: { color: colors.white, flex: 1, fontSize: 14, fontWeight: "700" },
  glassCard: {
    backgroundColor: colors.visuals.rgb_30_77_145_0_54,
    borderColor: colors.visuals.rgb_255_255_255_0_1,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  hero: { minHeight: 390, paddingHorizontal: spacing.xl, paddingTop: 50 },
  heroDescription: { color: colors.white, fontSize: 17, marginTop: spacing.sm },
  heroHeader: { flexDirection: "row", justifyContent: "space-between" },
  heroTemperature: {
    color: colors.white,
    fontSize: 104,
    fontWeight: "300",
    letterSpacing: -5,
    lineHeight: 118,
    marginTop: spacing.lg,
  },
  highTemperature: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    width: 28,
  },
  hourlyRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  hourItem: { alignItems: "center", gap: 7, width: 64 },
  hourTemperature: { color: colors.white, fontSize: 15, fontWeight: "700" },
  hourText: { color: colors.visuals.rgb_255_255_255_0_72, fontSize: 11 },
  loading: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  loadingText: { color: colors.white, fontSize: 14 },
  location: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 52,
  },
  lowTemperature: { color: colors.visuals.rgb_255_255_255_0_72, fontSize: 13, width: 28 },
  metricCard: {
    backgroundColor: colors.visuals.rgb_30_77_145_0_54,
    borderColor: colors.visuals.rgb_255_255_255_0_1,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 142,
    padding: spacing.lg,
    width: "48%",
  },
  metricDetail: {
    color: colors.visuals.rgb_255_255_255_0_65,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  metricHeader: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  metricLabel: { color: colors.visuals.rgb_255_255_255_0_68, fontSize: 12 },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  metricValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  range: {
    color: colors.visuals.rgb_255_255_255_0_75,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  screen: { backgroundColor: colors.visuals.hex_4D83C6, flex: 1 },
  scroll: { backgroundColor: colors.visuals.hex_4D83C6, flex: 1 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.visuals.rgb_255_255_255_0_75,
    fontSize: 13,
    fontWeight: "600",
  },
  source: {
    color: colors.visuals.rgb_255_255_255_0_58,
    fontSize: 11,
    marginTop: spacing.xl,
    textAlign: "center",
  },
  temperatureBar: {
    backgroundColor: colors.visuals.rgb_255_255_255_0_2,
    borderRadius: 3,
    height: 5,
    overflow: "hidden",
    width: 54,
  },
  temperatureFill: {
    backgroundColor: colors.visuals.hex_FFAA4C,
    borderRadius: 3,
    height: 5,
    width: "72%",
  },
  windText: { color: colors.visuals.rgb_255_255_255_0_62, fontSize: 9 },
});
