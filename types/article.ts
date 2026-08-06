export enum ArticleBlockType {
  Text = 0,
  Heading = 1,
  Image = 2,
  Video = 3,
  Quote = 4,
  Divider = 5,
  Code = 6,
  Embed = 7,
}

export type ArticleBlock = {
  id?: string;
  orderIndex: number;
  type: ArticleBlockType;
  content?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Article = {
  id: string;
  title: string;
  visibility: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  thumbnailUrl: string | null;
  preview: string | null;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  viewCount: number;
  isOwner: boolean;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
    accountStyle: number;
  };
  blocks: ArticleBlock[];
};

export type SaveArticleInput = {
  title: string;
  visibility: number;
  blocks: ArticleBlock[];
};

export type UploadedArticleMedia = {
  mediaUrl: string;
  thumbnailUrl: string | null;
  type: ArticleBlockType.Image | ArticleBlockType.Video;
};
