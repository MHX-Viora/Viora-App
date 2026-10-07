import type { ArticleBlock } from "../../types/article";

export const getArticlePublishError = (title: string, blocks: ArticleBlock[]): string | null => {
  if (!title.trim()) return "Vui lòng nhập tiêu đề bài báo.";
  if (title.trim().length > 255) return "Tiêu đề bài báo tối đa 255 ký tự.";
  if (blocks.length === 0) return "Vui lòng thêm ít nhất một block nội dung, ảnh hoặc video.";
  return null;
};
