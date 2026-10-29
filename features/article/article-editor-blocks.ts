import type { ArticleBlock } from '@/types/article';

export type EditorArticleBlock = ArticleBlock & { clientKey: string };
let nextBlockKey = 0;

export function createEditorBlock(block: ArticleBlock): EditorArticleBlock {
  return { ...block, clientKey: block.id || `local-block:${++nextBlockKey}` };
}

export const normalizeOrder = <T extends ArticleBlock>(blocks: T[]): T[] =>
  blocks.map((block, orderIndex) => ({ ...block, orderIndex }));

export const serializeEditorBlocks = (blocks: EditorArticleBlock[]): ArticleBlock[] =>
  normalizeOrder(blocks).map(({ clientKey: _clientKey, createdAt: _createdAt, updatedAt: _updatedAt, ...block }) => block);
