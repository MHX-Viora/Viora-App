import type { LiveGiftIncome } from "@/services/live.service";

export async function fetchHostGiftIncome(liveId: string, fetchIncome: (id: string) => Promise<unknown>): Promise<LiveGiftIncome> {
  const income = await fetchIncome(liveId) as LiveGiftIncome | null;
  if (!income || income.liveId !== liveId || income.currency !== "VND" ||
    ![income.netAmount, income.totalGiftValue, income.totalGiftCount, income.senderCount]
      .every((value) => Number.isSafeInteger(value) && value >= 0) || income.netAmount > income.totalGiftValue) {
    throw new Error("Chưa xác nhận được tổng tiền quà. Vui lòng thử lại.");
  }
  return income;
}
