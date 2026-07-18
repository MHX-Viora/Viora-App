import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import "react-native-reanimated";

import { AppToastHost } from "@/components/common/app-toast";
import {
  registerPushNotifications,
  setupNotificationHandling,
  setupNotificationResponseHandling,
} from "@/services/push-notification.service";
import { startRealtime, stopRealtime } from "@/services/realtime.service";
import { getSession } from "@/stores/session-store";

export default function RootLayout() {
  const segments = useSegments();
  const hasRegisteredPushNotifications = useRef(false);

  useEffect(() => {
    setupNotificationHandling();
    setupNotificationResponseHandling();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      const session = await getSession();

      if (!session?.accessToken || session.user === null) {
        void stopRealtime();
        return;
      }

      if (state === "active") {
        void startRealtime();
      }
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
        currentRoute === "complete-profile";

      // Chưa đăng nhập thì chỉ cho ở login/register.
      if (!session?.accessToken) {
        void stopRealtime();
        if (currentRoute !== "login" && currentRoute !== "register") {
          router.replace("/login");
        }
        return;
      }

      // Đã đăng nhập nhưng chưa có user thì bắt hoàn thiện hồ sơ.
      if (session.user === null) {
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

      void startRealtime();
      if (!hasRegisteredPushNotifications.current) {
        hasRegisteredPushNotifications.current = true;
        void registerPushNotifications().catch((error: unknown) => {
          console.info(
            "[Push] registration failed",
            error instanceof Error ? error.message : String(error),
          );
          hasRegisteredPushNotifications.current = false;
        });
      }
    };

    checkLoginStatus();
  }, [segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="chat/[conversationId]" />
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
        <Stack.Screen name="complete-profile" />
      </Stack>
      <StatusBar style="auto" />
      <AppToastHost />
    </>
  );
}
