export type LiveTopGifter = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isVerified?: boolean;
  totalGiftCount: number;
  totalAmount: number;
};

export const sortLiveTopGifters = <T extends Pick<LiveTopGifter, "userId" | "totalAmount">>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => b.totalAmount - a.totalAmount || a.userId.localeCompare(b.userId));

export { formatGiftPrice as formatGiftAmountTotal } from "./live-gift-payment.ts";
