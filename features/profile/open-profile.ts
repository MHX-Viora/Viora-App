import type { Router } from "expo-router";

import { getUser } from "@/stores/session-store";

export const openProfileByUserId = async (
  router: Pick<Router, "push">,
  userId: string,
) => {
  const currentUser = await getUser();

  if (currentUser?.id === userId) {
    router.push("/(tabs)/profile");
    return;
  }

  router.push({ pathname: "/users/[userId]", params: { userId } });
};
