import type { WalletPayment } from "@/types/wallet";

type WalletErrorPayload = {
  detail?: unknown;
  error?: { message?: unknown };
  message?: unknown;
  title?: unknown;
  traceId?: unknown;
};

const nonBlankString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const formatWalletPaymentTimeRemaining = (
  expiresAt: string,
  nowMs = Date.now(),
) => {
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) return "00:00";

  const remainingSeconds = Math.max(
    0,
    Math.ceil((expiresAtMs - nowMs) / 1000),
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const resolveWalletRequestErrorMessage = (
  payload: unknown,
  fallback = "Không thể xử lý yêu cầu ví.",
) => {
  if (!payload || typeof payload !== "object") return fallback;
  const error = payload as WalletErrorPayload;
  const message = nonBlankString(error.error?.message)
    ?? nonBlankString(error.detail)
    ?? nonBlankString(error.title)
    ?? nonBlankString(error.message);
  if (!message) return fallback;

  const traceId = nonBlankString(error.traceId);
  return traceId ? `${message} (${traceId})` : message;
};

export const resolveWalletPaymentQrValue = (
  payment: Pick<WalletPayment, "checkoutUrl" | "qrCode">,
) => payment.qrCode?.trim() || payment.checkoutUrl?.trim() || null;
