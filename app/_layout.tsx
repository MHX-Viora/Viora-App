import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";

import { getSession } from "@/stores/session-store";

export default function RootLayout() {
  const segments = useSegments();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

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
        if (currentRoute !== "login" && currentRoute !== "register") {
          router.replace("/login");
        }
        setIsCheckingSession(false);
        return;
      }

      // Đã đăng nhập nhưng chưa có user thì bắt hoàn thiện hồ sơ.
      if (session.user === null) {
        if (currentRoute !== "complete-profile") {
          router.replace("/complete-profile");
        }
        setIsCheckingSession(false);
        return;
      }

      // Đã đăng nhập và có user thì không ở lại các màn auth nữa.
      if (isAuthRoute) {
        router.replace("/");
      }

      setIsCheckingSession(false);
    };

    checkLoginStatus();
  }, [segments]);

  if (isCheckingSession) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="users/[userId]" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="complete-profile" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
