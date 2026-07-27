import type { MentionReference } from "@/types/mention";

export type FeedPost = {
  id: string;
  author: string;
  authorId: string | null;
  avatar: string;
  isAuthorVerified: boolean;
  isMine: boolean;
  link: string | null;
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
  mentions?: MentionReference[];
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
  link?: string | null;
  createdAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
    isFollowing?: boolean;
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
  mentions?: MentionReference[];
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
  mentionUserIds?: string[];
};
