import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

type ToastType = "success" | "error";

type ToastPayload = {
  message: string;
  title?: string;
  type?: ToastType;
};

type ToastListener = (payload: ToastPayload) => void;

const listeners = new Set<ToastListener>();

export const showAppToast = (payload: ToastPayload) => {
  listeners.forEach((listener) => listener(payload));
};

export function AppToastHost() {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        duration: 180,
        toValue: -120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        duration: 160,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  };

  useEffect(() => {
    const listener: ToastListener = (payload) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast(payload);
      Animated.parallel([
        Animated.spring(translateY, {
          damping: 18,
          stiffness: 220,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 160,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
      timeoutRef.current = setTimeout(hide, 3200);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [opacity, translateY]);

  if (!toast) return null;

  const type = toast.type ?? "success";
  const icon = type === "success" ? "checkmark-circle" : "alert-circle";

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          opacity,
          paddingTop: insets.top + spacing.sm,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={hide}
        style={styles.toast}
      >
        <View style={[styles.iconWrap, type === "error" && styles.errorIcon]}>
          <Ionicons
            color={type === "error" ? colors.danger : colors.primary}
            name={icon}
            size={20}
          />
        </View>
        <View style={styles.copy}>
          {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
          <Text numberOfLines={2} style={styles.message}>
            {toast.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1 },
  errorIcon: { backgroundColor: "rgba(239, 71, 111, 0.12)" },
  host: {
    left: 0,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 999,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  message: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  title: { color: colors.text, fontSize: 14, fontWeight: "900", marginBottom: 2 },
  toast: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
});
