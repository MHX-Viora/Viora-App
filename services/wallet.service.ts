import { authenticatedFetch } from "@/services/authenticated-fetch";
import { resolveWalletRequestErrorMessage } from "@/utils/wallet-payment";
import type {
  Wallet,
  WalletPayment,
  WalletTransaction,
  WalletTransactionPage,
  WalletTransactionType,
  WalletBankAccount,
  WalletWithdrawal,
  WithdrawalQuote,
} from "@/types/wallet";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const JSON_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };
const walletDataListeners = new Set<() => void>();

export const invalidateWalletData = () => {
  for (const listener of walletDataListeners) listener();
};

export const subscribeWalletDataInvalidation = (listener: () => void) => {
  walletDataListeners.add(listener);
  return () => { walletDataListeners.delete(listener); };
};

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await authenticatedFetch(`${BASE_URL}${path}`, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = resolveWalletRequestErrorMessage(data);
    const error = new Error(message) as Error & { code?: string; details?: unknown };
    error.code = data?.error?.code ?? data?.code;
    error.details = data?.error?.details;
    throw error;
  }
  return data as T;
};

const idempotencyKey = (prefix: string) =>
  `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`;

export const getWallet = () => request<Wallet>("/api/wallet");

export const getWalletTransactions = (params: {
  page?: number;
  pageSize?: number;
  type?: WalletTransactionType;
} = {}) => {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  if (params.type !== undefined) query.set("type", String(params.type));
  return request<WalletTransactionPage>(`/api/wallet/transactions?${query}`);
};

export const getWalletTransaction = (id: string) =>
  request<WalletTransaction>(`/api/wallet/transactions/${encodeURIComponent(id)}`);

export const createWalletDeposit = (amount: number) => {
  const origin = typeof window === "undefined" ? "https://ankt.vn" : window.location.origin;
  return request<WalletPayment>("/api/wallet/deposits", {
    body: JSON.stringify({
      amount,
      cancelUrl: `${origin}/wallet/deposit?status=cancelled`,
      idempotencyKey: idempotencyKey("deposit"),
      returnUrl: `${origin}/wallet/deposit?status=return`,
    }),
    headers: JSON_HEADERS,
    method: "POST",
  });
};

export const getWalletPayment = (id: string) =>
  request<WalletPayment>(`/api/wallet/payments/${encodeURIComponent(id)}`);

export const getWalletBankAccounts = () =>
  request<WalletBankAccount[]>("/api/wallet/bank-accounts");

export const createWalletBankAccount = (input: {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  isDefault?: boolean;
}) => request<WalletBankAccount>("/api/wallet/bank-accounts", {
  body: JSON.stringify({ ...input, isDefault: input.isDefault ?? false }),
  headers: JSON_HEADERS,
  method: "POST",
});

export const getWithdrawalQuote = (amount: number) =>
  request<WithdrawalQuote>(`/api/wallet/withdrawals/quote?amount=${encodeURIComponent(String(amount))}`);

export const createWalletWithdrawal = (amount: number, bankAccountId: string, requestKey: string) =>
  request<WalletWithdrawal>("/api/wallet/withdrawals", {
    body: JSON.stringify({ amount, bankAccountId, idempotencyKey: requestKey }),
    headers: JSON_HEADERS,
    method: "POST",
  });

export const createWithdrawalIdempotencyKey = () => idempotencyKey("withdrawal");

export const getWalletWithdrawal = (id: string) =>
  request<WalletWithdrawal>(`/api/wallet/withdrawals/${encodeURIComponent(id)}`);
