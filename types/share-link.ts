export type ShareLinkType =
  | "User"
  | "Post"
  | "Reel"
  | "Group"
  | "Livestream"
  | "Hashtag"
  | "Shop"
  | string;

export type ShareLink = {
  id: string;
  inviteCode?: string;
  shareUrl: string;
  type: ShareLinkType;
};
