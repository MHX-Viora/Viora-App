export type Reel = {
  id: string;
  authorId: string | null;
  author: string;
  avatar: string;
  caption: string;
  hashtags: string;
  isAuthorVerified: boolean;
  isFollowing: boolean;
  isMine: boolean;
  isReacted: boolean;
  isSaved: boolean;
  reactionCount: number;
  reactionType: number;
  saveCount: number;
  shareCount: number;
  thumbnailUrl: string;
  videoUrl: string;
  sourceSize: string;
  likes: string;
  comments: string;
};

export type ReelSort = "friends" | "following" | "popular";

export type ApiReel = {
  id: string;
  content: string;
  location: string | null;
  createdAt: string;
  viewCount: number;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  isSaved: boolean;
  isReacted: boolean;
  reactionType: number;
  media: {
    id: string;
    mediaUrl: string;
    thumbnailUrl: string | null;
  }[];
  hashtags: string[];
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
    isFollowing: boolean;
  };
};

export type ReelsResponse = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: ApiReel[];
};

export type CreateReelInput = {
  content: string;
  hashtags: string[];
  videoName?: string;
  videoType?: string;
  videoUri: string;
};

export type Hashtag = {
  id: string;
  name: string;
  postCount: number;
};

export type HashtagsResponse = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: Hashtag[];
};
