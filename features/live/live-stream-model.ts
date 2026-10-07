import type { LiveSession } from "@/services/live.service";

export type LiveStreamPreview = {
  id: string;
  title: string;
  creator: string;
  avatarUrl: string;
  avatarSource?: number;
  thumbnailUrl: string;
  thumbnailSource?: number;
  topic: string;
  viewerCount: number;
  followerCount: number;
  isFeatured?: boolean;
};

export const toLiveStreamPreview = (live: LiveSession): LiveStreamPreview => ({
  id: live.id,
  title: live.title,
  creator: live.hostName,
  avatarUrl: live.hostAvatarUrl ?? "",
  thumbnailUrl: live.coverUrl ?? "",
  topic: live.categoryName,
  viewerCount: live.currentViewerCount,
  followerCount: 0,
});
