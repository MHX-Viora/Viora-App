import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, type AppTheme, useTheme } from "@/theme";

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const hide = useCallback(() => {
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
  }, [opacity, translateY]);

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
  }, [hide, opacity, translateY]);

  if (!toast) return null;

  const type = toast.type ?? "success";
  const icon = type === "success" ? "checkmark" : "alert-circle";

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
      <Pressable accessibilityRole="button" onPress={hide} style={styles.toast}>
        <View style={[styles.iconWrap, type === "error" && styles.errorIcon]}>
          {type === "success" ? (
            <>
              <Image
                source={require("@/assets/images/viora_logo.png")}
                style={styles.appIcon}
              />
            </>
          ) : (
            <Ionicons color={theme.colors.danger} name={icon} size={14} />
          )}
        </View>
        <View style={styles.copy}>
          <Text
            numberOfLines={1}
            style={[styles.message, type === "error" && styles.errorMessage]}
          >
            {toast.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  copy: { flex: 1 },
  appIcon: { borderRadius: 5, height: 20, width: 20 },
  checkBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.text,
    borderRadius: 6,
    borderWidth: 1,
    bottom: -2,
    height: 12,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    width: 12,
  },
  errorIcon: { backgroundColor: theme.colors.primarySoft },
  errorMessage: { color: theme.colors.danger },
  host: {
    alignItems: "center",
    left: 0,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 999,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 5,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  message: {
    color: theme.colors.toastText,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  toast: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: theme.colors.toastBackground,
    borderRadius: 10,
    elevation: 10,
    flexDirection: "row",
    gap: 9,
    maxWidth: "88%",
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: theme.colors.shadow,
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
});
