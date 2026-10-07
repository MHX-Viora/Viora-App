export type LiveChatMessage = {
  id: string;
  createdAt?: string;
  userId?: string;
  name: string;
  avatarUrl?: string;
  text: string;
  kind?: "message" | "gift" | "joined";
  giftEmoji?: string;
  stickerUrl?: string;
};

export type LiveGift = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: "popular" | "special" | "other";
};

// Temporary room content. An API can replace this module without changing the viewer layout.
export const liveViewMock = {
  elapsedSeconds: 1684,
  likes: 125800,
  hostBadges: ["👑 Top 1 giải trí", "🏆 Hạng 3 tuần"],
  chat: [
    { id: "c1", name: "Bảo Ngọc", text: "Giọng chị thật dễ thương 💕" },
    { id: "c2", name: "Hoàng Nam", text: "Tuyệt vời luôn 😍" },
    { id: "c3", name: "Trần Anh", text: "Chị hát bài này hay quá! ❤️" },
    { id: "c4", name: "Minh Khoa", text: "đã gửi Hoa hồng x10", kind: "gift", giftEmoji: "🌹" },
    { id: "c5", name: "Lan Anh", text: "đã gửi Vương miện x1", kind: "gift", giftEmoji: "👑" },
    { id: "c6", name: "Quỳnh Chi", text: "Pháo hoa đẹp quá ✨" },
    { id: "c7", name: "Ngọc Anh", text: "Cho em xin tên bài hát với ạ?" },
    { id: "c8", name: "Tuấn Kiệt", text: "Em follow chị rồi, lâu lắm mới catch được live ❤️" },
  ] satisfies LiveChatMessage[],
  topGifters: [
    { userId: "s1", displayName: "Minh Khoa", totalGiftCount: 32, totalAmount: 2340, avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop" },
    { userId: "s2", displayName: "Lan Anh", totalGiftCount: 25, totalAmount: 1890, avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop" },
    { userId: "s3", displayName: "Quỳnh Chi", totalGiftCount: 18, totalAmount: 1420, avatarUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=96&h=96&fit=crop" },
    { userId: "s4", displayName: "Hoàng Nam", totalGiftCount: 12, totalAmount: 980, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop" },
    { userId: "s5", displayName: "Bảo Ngọc", totalGiftCount: 11, totalAmount: 850, avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop" },
    { userId: "s6", displayName: "Nguyễn Hoàng Minh Khánh", totalGiftCount: 8, totalAmount: 610 },
    { userId: "s7", displayName: "Trần Anh", totalGiftCount: 6, totalAmount: 470 },
    { userId: "s8", displayName: "Tuấn Kiệt", totalGiftCount: 4, totalAmount: 210 },
  ] satisfies LiveTopGifter[],
  gifts: [
    { id: "rose", name: "Hoa hồng", emoji: "🌹", price: 1, category: "other" },
    { id: "heart", name: "Trái tim", emoji: "💝", price: 5, category: "other" },
    { id: "coffee", name: "Cà phê", emoji: "☕", price: 10, category: "other" },
    { id: "firework", name: "Pháo hoa", emoji: "🎆", price: 20, category: "special" },
    { id: "crown", name: "Vương miện", emoji: "👑", price: 100, category: "special" },
    { id: "rocket", name: "Tên lửa", emoji: "🚀", price: 500, category: "special" },
  ] satisfies LiveGift[],
  stickers: ["💖", "✨", "🥳", "👏", "🔥", "💐"],
};
import type { LiveTopGifter } from "./live-top-gifters-model";
