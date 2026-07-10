export type FeedPost = {
  id: string;
  author: string;
  avatar: string;
  location: string;
  publishedAt: string;
  body: string;
  images: string[];
  reactions: number;
  comments: number;
  shares: number;
};
