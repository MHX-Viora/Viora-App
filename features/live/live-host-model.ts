export type HostTopic = string;
export type HostPrivacy = "public" | "followers" | "friends";

export type HostSettings = {
  title: string;
  description: string;
  topic: HostTopic | null;
  categoryId: string | null;
  privacy: HostPrivacy;
  allowComments: boolean;
  allowGifts: boolean;
  coverUri: string | null;
};

export type HostComment = {
  id: string;
  createdAt?: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  text: string;
  time: string;
  gift?: boolean;
  giftEmoji?: string;
  giftCount?: number;
  giftPrice?: number;
  pinned?: boolean;
  hidden?: boolean;
};

export function getHostTopGifters(comments: readonly HostComment[]) {
  const gifters = new Map<string, { userId: string; displayName: string; totalGiftCount: number; totalAmount: number }>();
  for (const comment of comments) {
    if (!comment.gift || comment.hidden) continue;
    const current = gifters.get(comment.userId) ?? { userId: comment.userId, displayName: comment.name, totalGiftCount: 0, totalAmount: 0 };
    current.totalGiftCount += comment.giftCount ?? 1;
    current.totalAmount += (comment.giftCount ?? 1) * (comment.giftPrice ?? 0);
    gifters.set(comment.userId, current);
  }
  return [...gifters.values()].sort((a, b) => b.totalAmount - a.totalAmount || a.userId.localeCompare(b.userId));
}

export const initialHostSettings: HostSettings = {
  title: "",
  description: "",
  topic: null,
  categoryId: null,
  privacy: "public",
  allowComments: true,
  allowGifts: true,
  coverUri: null,
};

export function validateHostSettings(settings: HostSettings): "title" | "topic" | null {
  if (!settings.title.trim() || settings.title.length > 100) return "title";
  if (!settings.categoryId || !settings.topic) return "topic";
  return null;
}

export function formatHostDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining].map((value) => String(value).padStart(2, "0")).join(":");
}

export const demoHostComments: HostComment[] = [
  { id: "c1", userId: "an", name: "Nguyễn An", text: "Xin chào bạn 👋", time: "Vừa xong" },
  { id: "c2", userId: "minh", name: "Minh Trần", text: "Hay quá ❤️", time: "1 phút trước" },
  { id: "c3", userId: "phuong", name: "Phương Linh", text: "Giọng hay quá!", time: "2 phút trước" },
  { id: "c4", userId: "nam", name: "Hoàng Nam", text: "đã gửi Hoa hồng x1", time: "3 phút trước", gift: true, giftEmoji: "🌹", giftCount: 1, giftPrice: 1 },
  { id: "c5", userId: "thao", name: "Thảo Vy", text: "Live lâu nữa nhé ❤️", time: "5 phút trước" },
];
