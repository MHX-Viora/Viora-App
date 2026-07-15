import { useCallback, useEffect, useState } from "react";

import {
  createComment,
  createReply,
  getComments,
  getReplies,
} from "@/services/comment.service";
import { getUser } from "@/stores/session-store";
import type { Comment, Reply } from "@/types/comment";

const PAGE_SIZE = 20;

export type SendStatus = "sent" | "sending" | "error";
export type UiComment = Comment & { sendStatus?: SendStatus };
export type UiReply = Reply & { sendStatus?: SendStatus };

export type ReplyState = {
  items: UiReply[];
  page: number;
  totalPages: number;
  isLoading: boolean;
  isLoadingMore: boolean;
};

const DEFAULT_ME_AVATAR =
  "https://ui-avatars.com/api/?name=Ban&background=2868D7&color=fff";

const getOptimisticUser = async () => {
  const user = await getUser();

  return {
    id: user?.id ?? "me",
    displayName: user?.displayName?.trim() || "Bạn",
    avatarUrl: user?.avatarUrl || DEFAULT_ME_AVATAR,
    isVerified: user?.isVerified ?? false,
  };
};

export function useCommentsModal({
  onClose,
  onCommentCreated,
  postId,
  visible,
}: {
  onClose: () => void;
  onCommentCreated?: (postId: string) => void;
  postId: string | null;
  visible: boolean;
}) {
  const [comments, setComments] = useState<UiComment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyStateByComment, setReplyStateByComment] = useState<
    Record<string, ReplyState>
  >({});
  const [replyTarget, setReplyTarget] = useState<UiComment | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadComments = useCallback(
    async (nextPage: number) => {
      if (!postId) return;

      if (nextPage === 1) {
        setIsLoading(true);
        setErrorMessage("");
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await getComments({
          page: nextPage,
          pageSize: PAGE_SIZE,
          postId,
          sort: "newest",
        });

        setComments((current) =>
          nextPage === 1 ? result.comments : [...current, ...result.comments],
        );
        setPage(nextPage);
        setTotalPages(result.totalPages);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải bình luận.",
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [postId],
  );

  useEffect(() => {
    if (!visible || !postId) return;

    setComments([]);
    setReplyStateByComment({});
    setReplyTarget(null);
    setPage(1);
    setTotalPages(1);
    loadComments(1);
  }, [loadComments, postId, visible]);

  const close = () => {
    setComments([]);
    setReplyStateByComment({});
    setReplyTarget(null);
    setDraftComment("");
    setErrorMessage("");
    onClose();
  };

  const loadMore = () => {
    if (isLoading || isLoadingMore || page >= totalPages) return;
    loadComments(page + 1);
  };

  const hideReplies = (commentId: string) => {
    setReplyStateByComment((state) => {
      const next = { ...state };
      delete next[commentId];
      return next;
    });
  };

  const loadReplies = async (commentId: string, nextPage = 1) => {
    const current = replyStateByComment[commentId];
    if (
      current &&
      (current.isLoading ||
        current.isLoadingMore ||
        (nextPage > 1 && current.page >= current.totalPages))
    ) {
      return;
    }

    setReplyStateByComment((state) => ({
      ...state,
      [commentId]: {
        items: nextPage === 1 ? [] : state[commentId]?.items ?? [],
        page: state[commentId]?.page ?? 1,
        totalPages: state[commentId]?.totalPages ?? 1,
        isLoading: nextPage === 1,
        isLoadingMore: nextPage > 1,
      },
    }));

    try {
      const result = await getReplies({
        commentId,
        page: nextPage,
        pageSize: PAGE_SIZE,
        sort: "oldest",
      });

      setReplyStateByComment((state) => ({
        ...state,
        [commentId]: {
          items:
            nextPage === 1
              ? result.replies
              : [...(state[commentId]?.items ?? []), ...result.replies],
          page: nextPage,
          totalPages: result.totalPages,
          isLoading: false,
          isLoadingMore: false,
        },
      }));
    } catch {
      setReplyStateByComment((state) => ({
        ...state,
        [commentId]: {
          items: state[commentId]?.items ?? [],
          page: state[commentId]?.page ?? 1,
          totalPages: state[commentId]?.totalPages ?? 1,
          isLoading: false,
          isLoadingMore: false,
        },
      }));
    }
  };

  const submitReply = async (content: string, target: UiComment) => {
    const tempId = `local-reply-${Date.now()}`;
    const currentUser = await getOptimisticUser();
    const optimisticReply: UiReply = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
      replyToUser: {
        id: target.user.id,
        displayName: target.user.displayName,
      },
      user: currentUser,
      sendStatus: "sending",
    };

    setReplyStateByComment((state) => ({
      ...state,
      [target.id]: {
        items: [...(state[target.id]?.items ?? []), optimisticReply],
        page: state[target.id]?.page ?? 1,
        totalPages: state[target.id]?.totalPages ?? 1,
        isLoading: false,
        isLoadingMore: false,
      },
    }));
    setComments((current) =>
      current.map((comment) =>
        comment.id === target.id
          ? { ...comment, replyCount: comment.replyCount + 1 }
          : comment,
      ),
    );
    setReplyTarget(null);

    try {
      const reply = await createReply({ commentId: target.id, content });
      setReplyStateByComment((state) => ({
        ...state,
        [target.id]: {
          ...(state[target.id] ?? {
            page: 1,
            totalPages: 1,
            isLoading: false,
            isLoadingMore: false,
          }),
          items: (state[target.id]?.items ?? []).map((item) =>
            item.id === tempId ? reply : item,
          ),
        },
      }));
    } catch {
      setReplyStateByComment((state) => ({
        ...state,
        [target.id]: {
          ...(state[target.id] ?? {
            page: 1,
            totalPages: 1,
            isLoading: false,
            isLoadingMore: false,
          }),
          items: (state[target.id]?.items ?? []).map((item) =>
            item.id === tempId ? { ...item, sendStatus: "error" } : item,
          ),
        },
      }));
    }
  };

  const submitComment = async (content: string, currentPostId: string) => {
    const tempId = `local-comment-${Date.now()}`;
    const currentUser = await getOptimisticUser();
    const optimisticComment: UiComment = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: 0,
      replyCount: 0,
      isLiked: false,
      user: currentUser,
      sendStatus: "sending",
    };

    setComments((current) => [optimisticComment, ...current]);
    onCommentCreated?.(currentPostId);

    try {
      const newComment = await createComment({
        content,
        postId: currentPostId,
      });
      setComments((current) =>
        current.map((comment) =>
          comment.id === tempId ? newComment : comment,
        ),
      );
    } catch {
      setComments((current) =>
        current.map((comment) =>
          comment.id === tempId ? { ...comment, sendStatus: "error" } : comment,
        ),
      );
    }
  };

  const submit = async () => {
    const content = draftComment.trim();
    if (!postId || !content) return;

    setDraftComment("");

    if (replyTarget) {
      await submitReply(content, replyTarget);
      return;
    }

    await submitComment(content, postId);
  };

  return {
    close,
    comments,
    draftComment,
    errorMessage,
    hideReplies,
    isLoading,
    isLoadingMore,
    loadMore,
    loadReplies,
    replyStateByComment,
    replyTarget,
    setDraftComment,
    setReplyTarget,
    submit,
  };
}


