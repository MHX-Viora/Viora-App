import type { WalletTransaction, WalletTransactionType, WithdrawalStatus } from "@/types/wallet";

export const formatVnd = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);

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
  })[type];

export const walletTransactionSign = (amount: number) =>
  amount > 0 ? `+${formatVnd(amount)}` : formatVnd(amount);

export const walletTransactionStatusLabel = (
  item: Pick<WalletTransaction, "paymentStatus" | "status">,
) => {
  if (item.paymentStatus === 0) return "Đang xử lý";
  if (item.paymentStatus === 1) return "Thành công";
  if (item.paymentStatus === 2) return "Thất bại";
  if (item.paymentStatus === 3) return "Đã hủy";
  if (item.paymentStatus === 4) return "Đã hết hạn";
  if (item.status === 1) return "Thành công";
  if (item.status === 0) return "Đang xử lý";
  if (item.status === 2) return "Thất bại";
  return "Đã hủy";
};

export const withdrawalStatusLabel = (status: WithdrawalStatus) => ({
  0: "Chờ xử lý",
  1: "Đang xử lý",
  2: "Hoàn thành",
  3: "Thất bại",
  4: "Từ chối",
  5: "Đã hủy",
})[status];
