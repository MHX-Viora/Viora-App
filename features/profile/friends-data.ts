export type Friend = {
  avatar: string;
  handle: string;
  id: string;
  name: string;
};

export const friends: readonly Friend[] = [
  {
    id: "mai-anh",
    name: "Mai Anh",
    handle: "@maianh.daily",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
  },
  {
    id: "duc-huy",
    name: "Đức Huy",
    handle: "@duchuy.photo",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
  },
  {
    id: "thao-nhi",
    name: "Thảo Nhi",
    handle: "@thaonhi.travel",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200",
  },
  {
    id: "minh-khoa",
    name: "Minh Khoa",
    handle: "@khoa.creates",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
  },
  {
    id: "ngoc-linh",
    name: "Ngọc Linh",
    handle: "@linhngoc.foodie",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
  },
  {
    id: "quang-vinh",
    name: "Quang Vinh",
    handle: "@vinh.ontheroad",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
  },
];
