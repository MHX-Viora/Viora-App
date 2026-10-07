import { getPosts } from "@/services/feed.service";
import { canCreateArticle } from "@/types/account-style";

/** Each content type gets its own page; permission belongs to the viewed author. */
export async function getProfilePosts(userId: string, accountStyle: number | undefined, pageSize: number) {
  const params = { userId, page: 1, pageSize };
  const [community, articles] = await Promise.all([
    getPosts({ ...params, postType: 0 }),
    canCreateArticle(accountStyle) ? getPosts({ ...params, postType: 2 }) : null,
  ]);
  return { posts: [...community.posts, ...(articles?.posts ?? [])] };
}
