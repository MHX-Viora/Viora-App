import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, View } from "react-native";

import { getThemeDefinition } from "./theme-catalog";
import {
  DEFAULT_THEME_MODE,
  normalizeThemeMode,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from "./theme-mode";
import type { AppTheme } from "./types";

const THEME_FADE_DURATION_MS = 240;

type ThemeContextValue = {
  isHydrated: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  theme: AppTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function getTheme(mode: ThemeMode): AppTheme {
  return getThemeDefinition(mode).theme;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const [isHydrated, setIsHydrated] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const transitionSequence = useRef(0);

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((value) => setModeState(normalizeThemeMode(value)))
      .catch(() => setModeState(DEFAULT_THEME_MODE))
      .finally(() => setIsHydrated(true));
  }, []);

  const setMode = useCallback(
    async (nextMode: ThemeMode) => {
      const sequence = transitionSequence.current + 1;
      transitionSequence.current = sequence;

      if (nextMode === mode) {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => undefined);
        return;
      }

      await new Promise<void>((resolve) => {
        Animated.timing(opacity, {
          duration: THEME_FADE_DURATION_MS / 2,
          toValue: 0,
          useNativeDriver: true,
        }).start(() => resolve());
      });

      if (transitionSequence.current !== sequence) return;
      setModeState(nextMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => undefined);

      Animated.timing(opacity, {
        duration: THEME_FADE_DURATION_MS / 2,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    },
    [mode, opacity],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ isHydrated, mode, setMode, theme: getTheme(mode) }),
    [isHydrated, mode, setMode],
  );

  if (!isHydrated) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: getTheme(DEFAULT_THEME_MODE).colors.background },
        ]}
      />
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: value.theme.colors.background, opacity },
        ]}
      >
        {children}
      </Animated.View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
