const formatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
export const formatFeePercent = (value: number): string => percentFormatter.format(value) + "%";

export const isSafeVnd = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value);
export const formatVnd = (value: unknown): string => isSafeVnd(value) ? `${formatter.format(value)} ₫` : "—";
export const formatAnktCoin = (value: unknown): string => isSafeVnd(value) ? `${formatter.format(value)} ANKT coin` : "—";
export const formatCompactVnd = (value: unknown): string => {
  if (!isSafeVnd(value) || value < 0) return "—";
  const unit = value >= 1_000_000 ? 1_000_000 : value >= 1_000 ? 1_000 : 1;
  return unit === 1 ? formatVnd(value) : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value / unit)}${unit === 1_000 ? "K" : "M"}`;
};
// Reject signs, separators, fractions and unsafe values instead of changing their meaning.
export const parseVndInput = (text: string): number | null => /^\d+$/.test(text.trim()) && isSafeVnd(Number(text.trim())) ? Number(text.trim()) : null;
