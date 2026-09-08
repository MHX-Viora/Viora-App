export type Sticker = {
  id: string;
  stickerPackId: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  format: number;
  sortOrder: number;
};

export type StickerPack = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string;
  price: number;
  isFree: boolean;
  isFeatured: boolean;
  stickerCount: number;
  isOwned: boolean;
  canUse: boolean;
};

export type StickerPackDetail = {
  pack: StickerPack;
  isOwned: boolean;
  canUse: boolean;
  stickers: Sticker[];
};

export type StickerPackPage = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: StickerPack[];
};
