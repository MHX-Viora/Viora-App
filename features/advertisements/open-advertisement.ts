import { router } from "expo-router";
import { Alert, Linking } from "react-native";

import { openProfileByUserId } from "@/features/profile/open-profile";
import { createAdvertisementEventId, trackAdvertisementClick } from "@/services/advertisement.service";
import { createPrivateConversation } from "@/services/chat.service";
import { AdvertisementCtaType, type AdvertisementPresentation } from "@/types/advertisement";

export async function openAdvertisement(
  advertisement: AdvertisementPresentation,
  content: { id: string; authorId: string | null; postType: number },
) {
  if (!advertisement.isPreview) {
    await trackAdvertisementClick(advertisement.id, createAdvertisementEventId("click", advertisement.id)).catch(() => undefined);
  }

  if (advertisement.ctaType === AdvertisementCtaType.Message || advertisement.ctaType === AdvertisementCtaType.ContactNow) {
    if (!content.authorId) return;
    try {
      const conversationId = await createPrivateConversation(content.authorId);
      router.push({ pathname: "/chat/[conversationId]", params: { conversationId } });
    } catch (error) {
      Alert.alert("Không thể mở trò chuyện", error instanceof Error ? error.message : "Vui lòng thử lại.");
    }
    return;
  }

  if (advertisement.ctaType === AdvertisementCtaType.Follow && content.authorId) {
    await openProfileByUserId(router, content.authorId);
    return;
  }

  if (advertisement.destinationUrl?.startsWith("https://")) {
    await Linking.openURL(advertisement.destinationUrl).catch(() => Alert.alert("Không thể mở liên kết", "Liên kết quảng cáo hiện không khả dụng."));
    return;
  }

  if (content.postType === 1) router.push({ pathname: "/reel/[reelId]", params: { reelId: content.id } });
  else if (content.postType === 2) router.push({ pathname: "/article/[id]", params: { id: content.id } });
  else router.push({ pathname: "/post/[postId]", params: { postId: content.id } });
}
