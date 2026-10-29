export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return localDateKey(date) === value ? date : null;
}

export function addLocalDays(value: string, days: number): string {
  const date = parseLocalDate(value);
  if (!date) throw new RangeError("Ngày không hợp lệ.");
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function normalizeAdvertisementDuration(value: number): number {
  return Number.isFinite(value) ? Math.min(30, Math.max(1, Math.round(value))) : 1;
}

export function createAdvertisementSchedule(value: string, durationDays: number, now = new Date()) {
  const date = parseLocalDate(value);
  const today = localDateKey(now);
  if (!date || value < today || !Number.isInteger(durationDays) || durationDays <= 0) {
    throw new RangeError("Ngày bắt đầu phải từ hôm nay trở đi. Vui lòng chọn lại ngày.");
  }
  if (durationDays > 30) throw new RangeError("Thời gian chạy tối đa là 30 ngày.");
  const startAt = value === today ? new Date(now.getTime()) : date;
  const endAt = new Date(startAt.getTime() + durationDays * 86_400_000);
  return { startAt, endAt };
}

export function calendarMonthCells(value: string): (string | null)[] {
  const date = parseLocalDate(value);
  if (!date) return [];
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const count = Math.ceil((offset + days) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= days ? localDateKey(new Date(first.getFullYear(), first.getMonth(), day)) : null;
  });
}
