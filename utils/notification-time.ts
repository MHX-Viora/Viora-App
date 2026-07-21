export const formatNotificationTime = (value: string) => {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return "Vừa xong";

  const diffMs = Date.now() - createdAt;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const year = 365 * day;

  if (diffMs < minute || diffMs > year) return "Vừa xong";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} phút trước`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} giờ trước`;
  if (diffMs < 2 * day) return "Hôm qua";
  return `${Math.floor(diffMs / day)} ngày trước`;
};
