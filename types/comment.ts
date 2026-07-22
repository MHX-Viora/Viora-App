export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
  };
};

export type Reply = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  isLiked: boolean;
  replyToUser: {
    id: string;
    displayName: string;
  };
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
  };
};

export type CommentLikeResult = {
  commentId: string;
  isLiked: boolean;
  likeCount: number;
};

export type CommentsResponse = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: Comment[];
};

export type RepliesResponse = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: Reply[];
};
