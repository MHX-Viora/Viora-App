export type FeedPost = {
  id: string;
  author: string;
  avatar: string;
  location: string | null;
  publishedAt: string;
  body: string;
  images: string[];
  isReacted: boolean;
  isSaved: boolean;
  reactionType: number;
  reactions: number;
  saveCount: number;
  comments: number;
  shares: number;
  visibility: number;
};

export type ReactionResponse = {
  isReacted: boolean;
  reactionCount: number;
  reactionType: number;
};

export type SavePostResponse = {
  isSaved: boolean;
  saveCount: number;
};

export type ApiPost = {
  id: string;
  content: string;
  postType: number;
  visibility: number;
  location: string | null;
  createdAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
  } | null;
  media?: {
    id: string;
    mediaUrl: string;
    thumbnailUrl: string | null;
  }[];
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  viewCount: number;
  isReacted: boolean;
  reactionType: number;
  isSaved: boolean;
};

export type PostsResponse = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: ApiPost[];
};

export type CreatePostInput = {
  content: string;
  files: string[];
  latitude?: number;
  link?: string;
  locationName?: string;
  longitude?: number;
  post?: string;
  visibility: number;
};
