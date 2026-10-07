import { isValidGiftPrice } from "../../services/live-gift-catalog.ts";
import { formatCompactVnd } from "../../utils/money.ts";

export const formatGiftPrice = (amount: unknown): string => {
  if (!isValidGiftPrice(amount)) return "Chưa có giá VNĐ";
  return formatCompactVnd(amount);
};

// Only the server changes the actual wallet.
export const giftPaymentQuote = (price: number, quantity: number, balance: number | null) => {
  const total = price * quantity;
  const valid = isValidGiftPrice(price) && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 99 && Number.isSafeInteger(total);
  return { total, after: balance === null ? null : balance - total, canSend: valid && balance !== null && balance >= total };
};

export async function sendSingleGift<T extends { price: number }>(gift: T, balance: number | null, pending: { current: boolean }, send: (gift: T, quantity: number) => Promise<void>): Promise<boolean> {
  if (pending.current) return false;
  if (!isValidGiftPrice(gift.price)) throw new Error("Quà chưa có giá VNĐ hợp lệ.");
  if (balance === null) throw new Error("Chưa tải được số dư ví. Vui lòng thử lại.");
  if (!giftPaymentQuote(gift.price, 1, balance).canSend) throw new Error("Số dư của bạn không đủ để gửi món quà này.");
  pending.current = true;
  try {
    await send(gift, 1);
    return true;
  } finally { pending.current = false; }
}

export const rememberGiftTransaction = (seen: Set<string>, id: string): boolean => {
  if (!id || seen.has(id)) return false;
  seen.add(id);
  return true;
};
