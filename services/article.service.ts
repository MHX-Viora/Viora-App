import { authenticatedFetch } from "@/services/authenticated-fetch";
import type { Article, SaveArticleInput, UploadedArticleMedia } from "@/types/article";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export type ArticleInteractionKind =
  | "impression"
  | "open"
  | "view"
  | "notInterested";

const ARTICLE_INTERACTION_TYPES: Record<ArticleInteractionKind, number> = {
  impression: 0,
  open: 1,
  view: 2,
  notInterested: 7,
};

const readResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let data: { detail?: string; message?: string } | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as { detail?: string; message?: string };
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Backend chưa triển khai API Article. Vui lòng cập nhật backend trước khi tải ảnh.",
      );
    }
    const message = data?.detail || data?.message || "Không thể xử lý bài viết dài.";
    throw new Error(message);
  }
  return data as T;
};

export const getArticle = async (id: string) =>
  readResponse<Article>(await authenticatedFetch(`${BASE_URL}/api/articles/${encodeURIComponent(id)}`));

export const trackArticleInteraction = async (
  articleId: string,
  interactionType: ArticleInteractionKind,
  progress?: { readDuration?: number; readPercentage?: number },
) =>
  readResponse<{
    articleId: string;
    interactionType: number;
    readDuration: number;
    readPercentage: number;
  }>(await authenticatedFetch(
    `${BASE_URL}/api/articles/${encodeURIComponent(articleId)}/interactions`,
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        interactionType: ARTICLE_INTERACTION_TYPES[interactionType],
        readDuration: Math.max(0, Math.round(progress?.readDuration ?? 0)),
        readPercentage: Math.max(0, Math.min(100, progress?.readPercentage ?? 0)),
      }),
    },
  ));

export const createArticle = async (input: SaveArticleInput) =>
  readResponse<Article>(await authenticatedFetch(`${BASE_URL}/api/articles`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }));

export const updateArticle = async (id: string, input: SaveArticleInput) =>
  readResponse<Article>(await authenticatedFetch(`${BASE_URL}/api/articles/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }));

export const uploadArticleMedia = async (uris: string[]): Promise<UploadedArticleMedia[]> => {
  const formData = new FormData();
  uris.forEach((uri, index) => {
    const name = uri.split("/").pop() || `article-${index}`;
    const extension = name.split(".").pop()?.toLowerCase();
    const isVideo = ["mp4", "mov", "m4v", "webm"].includes(extension || "");
    formData.append("files", { uri, name, type: isVideo ? `video/${extension === "mov" ? "quicktime" : "mp4"}` : `image/${extension === "png" ? "png" : "jpeg"}` } as unknown as Blob);
  });
  return readResponse<UploadedArticleMedia[]>(await authenticatedFetch(`${BASE_URL}/api/articles/media`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  }));
};
