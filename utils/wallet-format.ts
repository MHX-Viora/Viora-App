import type { WalletTransaction, WalletTransactionType, WithdrawalStatus } from "@/types/wallet";

import { formatVnd } from "./money";
export { formatVnd } from "./money";

export const walletTransactionLabel = (type: WalletTransactionType) =>
  ({
    0: "Nạp tiền",
    1: "Nhận tiền",
    2: "Chuyển tiền",
    3: "Thanh toán",
    4: "Tạm giữ",
    5: "Hoàn tạm giữ",
    6: "Hoàn tiền",
    7: "Rút tiền",
    8: "Điều chỉnh",
    9: "Thanh toán tạm giữ",
    10: "Tặng quà Live",
    11: "Nhận quà Live",
  })[type] ?? "Giao dịch";

export const walletHistoryMonth = (createdAt: string | null | undefined) => {
  const date = createdAt ? new Date(createdAt) : null;
  return date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(date)
    : "Chưa có ngày giao dịch";
};

export const walletTransactionTitle = (item: Pick<WalletTransaction, "type" | "referenceType">) => {
  const advertisement = item.referenceType === "Advertisement" || item.referenceType === "AdvertisementEvent";
  if (advertisement && item.type === 4) return "Tạm giữ ngân sách quảng cáo";
  if (advertisement && item.type === 5) return "Hoàn tiền quảng cáo";
  if (advertisement && item.type === 9) return "Chi phí quảng cáo";
  if (advertisement && item.type === 6) return "Hoàn tiền quảng cáo";
  return walletTransactionLabel(item.type);
};

export const walletTransactionEndpoints = (item: Pick<WalletTransaction, "type" | "amount" | "source" | "destination">) => {
  const defaults: Record<WalletTransactionType, [string, string]> = {
    0: ["Ngân hàng", "Ví ANKT"],
    1: ["Người gửi", "Ví ANKT"],
    2: ["Ví ANKT", "Người nhận"],
    3: ["Ví ANKT", "Thanh toán"],
    4: ["Ví ANKT", "Số dư tạm giữ"],
    5: ["Số dư tạm giữ", "Ví ANKT"],
    6: ["Khoản hoàn tiền", "Ví ANKT"],
    7: ["Ví ANKT", "Tài khoản ngân hàng"],
    8: item.amount >= 0 ? ["Điều chỉnh", "Ví ANKT"] : ["Ví ANKT", "Điều chỉnh"],
    9: ["Số dư tạm giữ", "Chi phí quảng cáo"],
    10: ["Ví ANKT", "Chủ phòng Live"],
    11: ["Người tặng quà Live", "Ví ANKT"],
  };
  const [fallbackSource, fallbackDestination] = defaults[item.type] ?? ["Ví ANKT", "Giao dịch"];
  return [item.source?.trim() || fallbackSource, item.destination?.trim() || fallbackDestination] as const;
};

export const walletTransactionRoute = (item: Pick<WalletTransaction, "type" | "amount" | "source" | "destination">) =>
  walletTransactionEndpoints(item).join(" → ");

export const walletTransactionSign = (amount: number) =>
  amount > 0 ? `+${formatVnd(amount)}` : formatVnd(amount);

export const walletTransactionDirection = (item: Pick<WalletTransaction, "type" | "amount"> & Partial<Pick<WalletTransaction, "coinAmount">>) => {
  if (item.type === 4) return "held";
  if (item.type === 5) return "released";
  if ([0, 1, 6, 11].includes(item.type)) return "incoming";
  if ([2, 3, 7, 9, 10].includes(item.type)) return "outgoing";
  return (item.coinAmount ?? item.amount) >= 0 ? "incoming" : "outgoing";
};

export const walletTransactionDisplayAmount = (item: WalletTransaction) => {
  if (item.coinAmount != null) return Number.isSafeInteger(item.coinAmount) ? `${item.coinAmount > 0 ? "+" : ""}${item.coinAmount.toLocaleString("vi-VN")} ANKT coin` : "—";
  const amount = formatVnd(Math.abs(item.amount));
  const appliedWithdrawal = item.type === 7 && walletTransactionTone(item) === "pending" && item.balanceAfter < item.balanceBefore;
  if (walletTransactionTone(item) !== "success" && !appliedWithdrawal) return amount;
  return walletTransactionDirection(item) === "incoming" || walletTransactionDirection(item) === "released"
    ? `+${amount}`
    : `−${amount}`;
};

export const walletTransactionStatusLabel = (
  item: Pick<WalletTransaction, "paymentStatus" | "status"> & Partial<Pick<WalletTransaction, "type" | "relatedStatus">>,
) => {
  const paymentStatus = item.type == null || item.type === 0 ? item.paymentStatus : null;
  if (paymentStatus === 0) return item.type === 0 ? "Đang chờ thanh toán" : "Chờ thanh toán";
  if (paymentStatus === 1) return "Thành công";
  if (paymentStatus === 2) return "Thất bại";
  if (paymentStatus === 3) return "Đã hủy";
  if (paymentStatus === 4) return "Đã hết hạn";
  if (item.status === 1) {
    if (item.type === 4) return item.relatedStatus || "Đã tạm giữ";
    if (item.type === 0 || item.type === 7) return "Thành công";
    return item.type == null ? "Thành công" : "Hoàn thành";
  }
  if (item.status === 0) return "Đang xử lý";
  if (item.status === 2) return "Thất bại";
  return "Đã hủy";
};

export const walletTransactionTone = (
  item: Pick<WalletTransaction, "paymentStatus" | "withdrawalStatus" | "status"> & Partial<Pick<WalletTransaction, "type">>,
): "success" | "pending" | "failure" => {
  if ((item.type == null || item.type === 7) && item.withdrawalStatus != null)
    return item.withdrawalStatus === 2 ? "success" : item.withdrawalStatus < 2 ? "pending" : "failure";
  if ((item.type == null || item.type === 0) && item.paymentStatus != null)
    return item.paymentStatus === 1 ? "success" : item.paymentStatus === 0 ? "pending" : "failure";
  return item.status === 1 ? "success" : item.status === 0 ? "pending" : "failure";
};

export const withdrawalStatusLabel = (status: WithdrawalStatus) => ({
  0: "Chờ duyệt",
  1: "Đang chuyển tiền",
  2: "Thành công",
  3: "Thất bại",
  4: "Từ chối",
  5: "Đã hủy",
})[status] ?? "Chưa xác định";
