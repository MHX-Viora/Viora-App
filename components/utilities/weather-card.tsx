import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { WeatherDetailsModal } from "@/components/utilities/weather-details-modal";
import {
  fetchWeather,
  type CurrentWeather,
} from "@/features/utilities/weather";
import { colors, spacing } from "@/theme";

export function WeatherCard() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const loadWeather = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(false);
    try {
      let latitude = 21.0285;
      let longitude = 105.8542;
      let locationName = "Hà Nội";

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 10 * 60 * 1000,
            requiredAccuracy: 5000,
          });
          const position =
            lastKnown ??
            (await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }));
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;

          const [address] = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          locationName =
            address?.city ??
            address?.district ??
            address?.subregion ??
            address?.region ??
            "Vị trí của bạn";
        }
      } catch {
        // Keep the Hanoi fallback when location services are unavailable.
      }

      setWeather(
        await fetchWeather({
          latitude,
          locationName,
          longitude,
          signal,
        }),
      );
    } catch (requestError) {
      if ((requestError as Error).name !== "AbortError") setError(true);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadWeather(controller.signal);
    return () => controller.abort();
  }, [loadWeather]);

  const temperature = weather ? `${Math.round(weather.temperature)}°C` : "--°C";

  return (
    <>
      <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Ionicons color="#FFE08A" name="location" size={13} />
          <Text numberOfLines={1} style={styles.badgeText}>
            {weather?.locationName ?? "Đang xác định vị trí"} · Hiện tại
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Cập nhật thời tiết"
          accessibilityRole="button"
          disabled={isLoading}
          hitSlop={8}
          onPress={() => void loadWeather()}
          style={styles.refreshButton}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons color={colors.white} name="refresh" size={18} />
          )}
        </Pressable>
      </View>

      <View style={styles.weatherRow}>
        <View style={styles.conditionIcon}>
          <Ionicons
            color={colors.white}
            name={weather?.icon ?? "partly-sunny"}
            size={38}
          />
        </View>
        <View style={styles.weatherCopy}>
          <Text style={styles.temperature}>{temperature}</Text>
          <Text style={styles.condition}>
            {error
              ? "Không thể cập nhật"
              : (weather?.description ?? "Đang cập nhật…")}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Ionicons
            color="rgba(255,255,255,0.8)"
            name="thermometer-outline"
            size={16}
          />
          <Text style={styles.detailText}>
            Cảm giác{" "}
            {weather ? `${Math.round(weather.apparentTemperature)}°C` : "--"}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons
            color="rgba(255,255,255,0.8)"
            name="speedometer-outline"
            size={16}
          />
          <Text style={styles.detailText}>
            Gió {weather ? `${Math.round(weather.windSpeed)} km/h` : "--"}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Xem dự báo thời tiết chi tiết"
          accessibilityRole="button"
          disabled={!weather}
          onPress={() => setShowDetails(true)}
          style={styles.detailsButton}
        >
          <Text style={styles.detailsButtonText}>Xem chi tiết</Text>
          <Ionicons color={colors.white} name="chevron-forward" size={15} />
        </Pressable>
      </View>
      </View>
      {weather && (
        <WeatherDetailsModal
          current={weather}
          onClose={() => setShowDetails(false)}
          visible={showDetails}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  badgeText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#2568B8",
    borderRadius: 20,
    minHeight: 184,
    padding: spacing.lg,
  },
  condition: { color: "rgba(255,255,255,0.82)", fontSize: 14, marginTop: 2 },
  conditionIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  detailItem: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  detailText: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  details: {
    alignItems: "center",
    borderTopColor: "rgba(255,255,255,0.15)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  detailsButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    marginLeft: "auto",
  },
  detailsButtonText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  refreshButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  temperature: { color: colors.white, fontSize: 30, fontWeight: "800" },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weatherCopy: { flex: 1 },
  weatherRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
