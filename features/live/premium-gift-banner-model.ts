import type { PremiumGiftEffectState } from "./premium-gift-effect-model";
import type { LiveGiftOverlayEvent } from "./live-gift-overlay-model";

export function premiumGiftBanners(state: PremiumGiftEffectState, now: number): LiveGiftOverlayEvent[] {
  const groups = new Map<string, { event: LiveGiftOverlayEvent; expanded: number; completed: number }>();
  for (const total of Object.values(state.totals)) {
    const gift = total.gift, id = total.bannerEventId;
    const group = groups.get(id);
    if (group) {
      group.event.quantity += total.started; group.event.revision += total.started;
      group.expanded += total.expanded; group.completed += total.completed;
      group.event.expiresAt = Math.max(group.event.expiresAt, now + (total.expanded - total.completed) * 7000 + 1000);
    } else groups.set(id, { expanded: total.expanded, completed: total.completed, event: {
      id, senderUserId: gift.senderUserId, senderName: gift.senderName, senderAvatarUrl: gift.senderAvatarUrl,
      giftId: gift.giftId, giftName: gift.giftName, imageUrl: gift.imageUrl, quantity: total.started,
      tier: "premium", lastGiftAt: now, expiresAt: now + (total.expanded - total.completed) * 7000 + 1000,
      revision: total.started, effectType: gift.effectType, effectTier: gift.effectTier,
    } });
  }
  return [...groups.values()].filter(g => g.event.quantity > 0 && g.completed < g.expanded).map(g => g.event);
}
