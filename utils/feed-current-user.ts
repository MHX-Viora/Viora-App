import type { User } from "../types/auth";
import type { FeedPost } from "../types/feed";

export const applyCurrentUserToFeedPosts = (
  posts: FeedPost[],
  user: Pick<User, "id" | "displayName" | "avatarUrl" | "isVerified" | "accountStyle">,
): FeedPost[] => posts.map((post) => post.authorId === user.id
  ? {
      ...post,
      author: user.displayName,
      avatar: user.avatarUrl || post.avatar,
      isAuthorVerified: user.isVerified,
      authorAccountStyle: user.accountStyle,
    }
  : post);
