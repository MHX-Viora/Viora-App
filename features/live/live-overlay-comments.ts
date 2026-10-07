export function getLiveOverlayCommentLimit(_width: number, _height: number): number {
  return 5;
}

export function selectLiveOverlayComments<T extends { id: string }>(comments: readonly T[], pinned: T | null, limit = 5): { pinned: T | null; recent: T[] } {
  return {
    pinned,
    recent: comments.filter((comment) => comment.id !== pinned?.id).slice(-limit),
  };
}

export function isLiveHostComment(userId: string | null | undefined, hostUserId: string | null | undefined): boolean {
  return Boolean(userId && hostUserId && userId.toLowerCase() === hostUserId.toLowerCase());
}
