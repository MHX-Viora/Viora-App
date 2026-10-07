export const isOwnPost = (
  post: { isMine?: boolean; isOwner?: boolean; user?: { id: string } | null },
  currentUserId?: string | null,
) => post.isMine === true || post.isOwner === true || (!!currentUserId && post.user?.id === currentUserId);
