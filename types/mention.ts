export type MentionReference = {
  userId: string;
  displayName: string;
};

export type MentionUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
};
