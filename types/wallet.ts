export type WalletStatus = 0 | 1 | 2;
export type PaymentStatus = 0 | 1 | 2 | 3 | 4;
export type WalletTransactionType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Wallet = {
  id: string;
  availableBalance: number;
  heldBalance: number;
  anktCoinBalance: number;
  currency: "VND";
  status: WalletStatus;
};

export type WithdrawalStatus = 0 | 1 | 2 | 3 | 4 | 5;

export type WalletBankAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountHolderName: string;
  isDefault: boolean;
  createdAt: string;
};

export type WalletWithdrawal = {
  id: string;
  transactionCode: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: "VND";
  status: WithdrawalStatus;
  bankAccountId: string;
  bankCode: string;
  bankName: string;
  bankAccountMasked: string;
  bankAccountHolderName: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  processingAt: string | null;
  completedAt: string | null;
};

export type WithdrawalQuote = {
  amount: number;
  fee: number;
  netAmount: number;
  minimumAmount: number;
  maximumAmount: number;
};

export type WalletTransaction = {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  heldBefore: number;
  heldAfter: number;
  referenceType: string;
  referenceId: string;
  description: string | null;
  status: 0 | 1 | 2 | 3;
  withdrawalStatus?: WithdrawalStatus | null;
  paymentStatus?: PaymentStatus | null;
  createdAt: string;
  completedAt: string | null;
};

export type WalletTransactionPage = {
  data: WalletTransaction[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type WalletPayment = {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerOrderCode: number;
  providerTransactionId: string | null;
  checkoutUrl: string | null;
  qrCode: string | null;
  transferContent: string;
  transactionId: string | null;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
};
