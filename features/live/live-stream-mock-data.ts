export type LiveStreamTopic = "Trò chuyện" | "Âm nhạc" | "Game" | "Đời sống" | "Ẩm thực";

export type LiveStreamPreview = {
  id: string;
  title: string;
  creator: string;
  avatarUrl: string;
  avatarSource?: number;
  thumbnailUrl: string;
  thumbnailSource?: number;
  topic: LiveStreamTopic;
  viewerCount: number;
  followerCount: number;
  isFeatured?: boolean;
};

// Demo content only. Keep this file isolated so it can be removed when Live APIs arrive.
export const liveStreams: LiveStreamPreview[] = [
  {
    id: "linh-chill",
    title: "Tâm sự cuối tuần cùng mọi người ✨",
    creator: "Linh Nguyễn",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
    avatarSource: require("../../assets/images/default-live-cover-neon.png"),
    thumbnailUrl: "",
    thumbnailSource: require("../../assets/images/default-live-cover-neon.png"),
    topic: "Trò chuyện",
    viewerCount: 1240,
    followerCount: 125800,
    isFeatured: true,
  },
  {
    id: "minh-acoustic",
    title: "Hát cho bạn nghe — acoustic tối nay 🎸",
    creator: "Minh Khang",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
    thumbnailUrl: "",
    topic: "Âm nhạc",
    viewerCount: 860,
    followerCount: 48700,
  },
  {
    id: "an-gaming",
    title: "Rank tối cùng anh em — vào đội nào! 🎮",
    creator: "An Gaming",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop",
    thumbnailUrl: "",
    topic: "Game",
    viewerCount: 3920,
    followerCount: 214000,
  },
  {
    id: "mai-cooking",
    title: "Vào bếp làm bánh cùng mình 🧁",
    creator: "Mai Phương",
    avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&h=120&fit=crop",
    thumbnailUrl: "",
    topic: "Ẩm thực",
    viewerCount: 418,
    followerCount: 32600,
  },
  {
    id: "huy-tech",
    title: "Giải đáp công nghệ và chuyện nghề 💻",
    creator: "Huy Trần",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
    thumbnailUrl: "",
    topic: "Trò chuyện",
    viewerCount: 2300,
    followerCount: 91600,
  },
  {
    id: "chi-da-lat",
    title: "Khám phá Đà Lạt cùng mình 🌲",
    creator: "Quỳnh Chi",
    avatarUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=120&h=120&fit=crop",
    thumbnailUrl: "",
    topic: "Đời sống",
    viewerCount: 675,
    followerCount: 42700,
  },
  {
    id: "bao-cafe",
    title: "Một buổi sáng chậm ở quán cà phê ☕",
    creator: "Bảo Ngọc",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop",
    thumbnailUrl: "",
    topic: "Đời sống",
    viewerCount: 980,
    followerCount: 58400,
  },
  {
    id: "tuan-beats",
    title: "Chill cùng playlist lofi cuối ngày 🎧",
    creator: "Tuấn Lê",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop",
    thumbnailUrl: "",
    topic: "Âm nhạc",
    viewerCount: 312,
    followerCount: 18900,
  },
];

export const liveStreamTopics = ["Tất cả", "Trò chuyện", "Âm nhạc", "Game", "Đời sống", "Ẩm thực"] as const;
