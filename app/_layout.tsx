import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { ActiveCallBanner } from "@/components/calls/active-call-banner";
import { AppToastHost } from "@/components/common/app-toast";
import { IncomingCallHost } from "@/components/calls/incoming-call-host";
import { AppLaunchScreen } from "@/components/layout/app-launch-screen";
import { emitRealtimeSyncRequest } from "@/features/chat/chat-events";
import {
  restorePendingIncomingCall,
  setNotificationNavigationReady,
} from "@/features/notifications/notification-response-navigation";
import { syncChatUnreadCount } from "@/services/chat-sync.service";
import { getNotifications } from "@/services/notification.service";
import { setupIncomingCallNotifeeEvents } from "@/services/incoming-call-notifee-events";
import {
  registerPushNotifications,
  setupNotificationHandling,
  setupNotificationResponseHandling,
  setupPushTokenRefreshHandling,
} from "@/services/push-notification.service";
import { startRealtime, stopRealtime } from "@/services/realtime.service";
import { getSession } from "@/stores/session-store";
import { setNotificationUnreadCount } from "@/utils/notification-unread-count";
import { ThemeProvider, useTheme } from "@/theme";

let appSyncPromise: Promise<void> | null = null;

const synchronizeAuthenticatedApp = (reason: "cold-start" | "resume") => {
  if (appSyncPromise) return appSyncPromise;

  console.info("[ChatSync] app sync started", {
    appState: AppState.currentState,
    reason,
    timestamp: new Date().toISOString(),
  });
  emitRealtimeSyncRequest();

  appSyncPromise = Promise.all([
    startRealtime(),
    syncChatUnreadCount(reason),
    getNotifications({ page: 1, pageSize: 1 })
      .then((result) => {
        console.info("[NotificationSync] unread count fetched", {
          reason,
          source: "api",
          timestamp: new Date().toISOString(),
          unreadCount: result.unreadCount,
        });
        setNotificationUnreadCount(result.unreadCount);
      })
      .catch((error: unknown) => {
        console.info("[NotificationSync] unread count fetch failed", {
          message: error instanceof Error ? error.message : String(error),
          reason,
          source: "api",
          timestamp: new Date().toISOString(),
        });
      }),
  ])
    .then(() => {
      console.info("[ChatSync] app sync completed", {
        appState: AppState.currentState,
        reason,
        timestamp: new Date().toISOString(),
      });
    })
    .finally(() => {
      appSyncPromise = null;
    });

  return appSyncPromise;
};

function RootLayoutContent() {
  const { theme } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.background,
        border: theme.colors.border,
        card: theme.colors.surfaceElevated,
        notification: theme.colors.danger,
        primary: theme.colors.primary,
        text: theme.colors.text,
      },
    };
  }, [theme]);
  const segments = useSegments();
  const hasRegisteredPushNotifications = useRef(false);
  const hasHydratedAuthenticatedState = useRef(false);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    setupNotificationHandling();
    setupNotificationResponseHandling();
    setupIncomingCallNotifeeEvents();
    setupPushTokenRefreshHandling();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      const session = await getSession();
      if (state !== AppState.currentState) return;

      if (!session?.accessToken || session.user === null) {
        void stopRealtime();
        return;
      }

      if (state === "active") {
        console.info("[ChatSync] app resumed", {
          appState: state,
          timestamp: new Date().toISOString(),
        });
        void synchronizeAuthenticatedApp("resume");
        return;
      }

      console.info("[ChatSync] app backgrounded", {
        appState: state,
        timestamp: new Date().toISOString(),
      });
      void stopRealtime().then(() => {
        if (AppState.currentState === "active") {
          void startRealtime();
        }
      });
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const session = await getSession();
      const currentRoute = segments[0];

      const isAuthRoute =
        currentRoute === "login" ||
        currentRoute === "register" ||
        currentRoute === "forgot-password" ||
        currentRoute === "__" ||
        currentRoute === "complete-profile";

      // Chưa đăng nhập thì chỉ cho ở login/register.
      if (!session?.accessToken) {
        hasHydratedAuthenticatedState.current = false;
        setNotificationNavigationReady(false);
        void stopRealtime();
        if (
          currentRoute !== "login" &&
          currentRoute !== "register" &&
          currentRoute !== "forgot-password" &&
          currentRoute !== "__"
        ) {
          router.replace("/login");
        }
        return;
      }

      // Đã đăng nhập nhưng chưa có user thì bắt hoàn thiện hồ sơ.
      if (session.user === null) {
        hasHydratedAuthenticatedState.current = false;
        setNotificationNavigationReady(false);
        void stopRealtime();
        if (currentRoute !== "complete-profile") {
          router.replace("/complete-profile");
        }
        return;
      }

      // Đã đăng nhập và có user thì không ở lại các màn auth nữa.
      if (isAuthRoute) {
        router.replace("/");
      }

      await restorePendingIncomingCall();
      setNotificationNavigationReady(true);
      if (!hasHydratedAuthenticatedState.current) {
        hasHydratedAuthenticatedState.current = true;
        void synchronizeAuthenticatedApp("cold-start");
      }
      if (!hasRegisteredPushNotifications.current) {
        void registerPushNotifications()
          .then((token) => {
            hasRegisteredPushNotifications.current = token !== null;
          })
          .catch((error: unknown) => {
            console.info(
              "[Push] registration failed",
              error instanceof Error ? error.message : String(error),
            );
            hasRegisteredPushNotifications.current = false;
          });
      }
    };

    void checkLoginStatus()
      .catch((error: unknown) => {
        console.info(
          "[Session] initial hydration failed",
          error instanceof Error ? error.message : String(error),
        );
        router.replace("/login");
      })
      .finally(() => setIsAppReady(true));
  }, [segments]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={{ backgroundColor: theme.colors.background, flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="account-settings" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="security-privacy" />
        <Stack.Screen name="policies-terms" />
        <Stack.Screen name="support" />
        <Stack.Screen name="profile-activity" />
        <Stack.Screen name="user/[userId]" />
        <Stack.Screen name="post/[postId]" />
        <Stack.Screen name="reel/[reelId]" />
        <Stack.Screen name="group/[inviteCode]" />
        <Stack.Screen name="call/[callId]" />
        <Stack.Screen name="group-call/[callId]" />
        <Stack.Screen name="chat/[conversationId]" />
        <Stack.Screen name="chat/group/[groupId]" />
        <Stack.Screen name="chat/group-preview" />
        <Stack.Screen name="chat/settings/[conversationId]" />
        <Stack.Screen name="chat/settings/[conversationId]-attachments" />
        <Stack.Screen name="chat/settings/attachments" />
        <Stack.Screen name="chat/settings/[conversationId]-links" />
        <Stack.Screen name="chat/settings/links" />
        <Stack.Screen name="chat/settings/[conversationId]-report" />
        <Stack.Screen name="chat/settings/[conversationId]-search" />
        <Stack.Screen name="users/[userId]" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="__/auth/links" />
        <Stack.Screen name="complete-profile" />
        <Stack.Screen name="download" />
        </Stack>
        <StatusBar
          backgroundColor={theme.colors.background}
          style={theme.isDark ? "light" : "dark"}
        />
        <ActiveCallBanner />
        <IncomingCallHost />
        <AppToastHost />
        {!isAppReady && <AppLaunchScreen />}
      </View>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
