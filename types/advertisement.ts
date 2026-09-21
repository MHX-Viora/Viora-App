export enum AdvertisementPlacement {
  Feed = 0,
  Reels = 1,
  News = 2,
}

export enum AdvertisementStatus {
  Draft = 0,
  Pending = 1,
  Approved = 2,
  Active = 3,
  Paused = 4,
  Completed = 5,
  Rejected = 6,
  Cancelled = 7,
}

export enum AdvertisementObjective {
  Awareness = 0,
  Traffic = 1,
  Engagement = 2,
}

export enum AdvertisementCtaType {
  LearnMore = 0,
  BuyNow = 1,
  Message = 2,
  SignUp = 3,
  Download = 4,
  ViewProduct = 5,
  GetOffer = 6,
  ContactNow = 7,
  Follow = 8,
}

export enum AdvertisementTargetingMode {
  Automatic = 0,
  Custom = 1,
}

export enum AdvertisementFeedbackType {
  Hide = 0,
  NotInterested = 1,
  Report = 2,
}

export type AdvertisementContent = {
  id: string;
  postType: number;
  content: string | null;
  location: string | null;
  link: string | null;
  createdAt: string;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  viewCount: number;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
    accountStyle: number;
  };
  media: { id: string; mediaUrl: string; thumbnailUrl: string | null }[];
  article: {
    title: string;
    thumbnailUrl: string | null;
    preview: string | null;
    readingTimeMinutes: number;
  } | null;
};

export type Advertisement = {
  id: string;
  postId: string;
  advertiserId: string;
  placement: AdvertisementPlacement;
  objective: AdvertisementObjective;
  destinationType: number;
  destinationUrl: string | null;
  ctaType: AdvertisementCtaType;
  targetingMode: AdvertisementTargetingMode;
  minimumAge: number | null;
  maximumAge: number | null;
  targetLocation: string | null;
  dailyBudget: number | null;
  totalBudget: number;
  spentAmount: number;
  reservedAmount: number;
  startAt: string;
  endAt: string;
  status: AdvertisementStatus;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
  impressions: number;
  clicks: number;
  clickThroughRate: number;
  content: AdvertisementContent;
};

export type AdvertisementPage = {
  items: Advertisement[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type CreateAdvertisementInput = {
  postId: string;
  objective: AdvertisementObjective;
  destinationUrl?: string;
  ctaType: AdvertisementCtaType;
  targetingMode: AdvertisementTargetingMode;
  minimumAge?: number;
  maximumAge?: number;
  targetLocation?: string;
  dailyBudget?: number;
  totalBudget: number;
  startAt: string;
  endAt: string;
};

export type AdvertisementPresentation = {
  id: string;
  ctaType: AdvertisementCtaType;
  destinationUrl: string | null;
};
