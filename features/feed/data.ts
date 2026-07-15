import type { FeedPost } from "@/types/feed";

export const feedPosts: FeedPost[] = [
  {
    id: "viora-office",
    author: "Lê Thị Hà",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160",
    location: "Sài Gòn, Việt Nam",
    publishedAt: "2 giờ trước",
    body: "Văn phòng dành cho trải nghiệm sáng tạo và kết nối. Một không gian mới, nơi mọi ý tưởng đều có thể cất cánh ✨",
    images: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160",
    ],
    isReacted: false,
    isSaved: false,
    reactionType: 0,
    reactions: 128,
    saveCount: 0,
    comments: 46,
    shares: 12,
    visibility: 0,
  },
  {
    id: "coffee-workday",
    author: "Minh Anh",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160",
    location: "Đà Nẵng, Việt Nam",
    publishedAt: "4 giờ trước",
    body: "Một buổi sáng chậm rãi bên góc làm việc yêu thích. Cà phê ngon, nhạc vừa đủ và danh sách công việc đang ngắn dần ☕",
    images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200",
    ],
    isReacted: false,
    isSaved: false,
    reactionType: 0,
    reactions: 264,
    saveCount: 0,
    comments: 38,
    shares: 19,
    visibility: 0,
  },
  {
    id: "weekend-trip",
    author: "Quang Huy",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160",
    location: "Đà Lạt, Việt Nam",
    publishedAt: "Hôm qua",
    body: "Cuối tuần đổi không khí một chút. Đà Lạt vẫn lạnh, nhiều sương và luôn khiến mình muốn quay lại.",
    images: [
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200",
    ],
    isReacted: false,
    isSaved: false,
    reactionType: 0,
    reactions: 842,
    saveCount: 0,
    comments: 97,
    shares: 44,
    visibility: 0,
  },
  {
    id: "creative-team",
    author: "Viora Creative",
    avatar:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=160",
    location: "Hà Nội, Việt Nam",
    publishedAt: "2 ngày trước",
    body: "Buổi brainstorming đầu tuần: nhiều ý tưởng, nhiều tiếng cười và một sản phẩm mới đang dần thành hình.",
    images: [
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200",
    ],
    isReacted: false,
    isSaved: false,
    reactionType: 0,
    reactions: 531,
    saveCount: 0,
    comments: 72,
    shares: 31,
    visibility: 0,
  },
];
