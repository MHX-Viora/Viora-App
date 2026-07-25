import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  type ReplyState,
  type ReplyTarget,
  type SendStatus,
  type UiComment,
  useCommentsModal,
} from "@/components/comments/use-comments-modal";
import { communityColors as colors } from "@/features/feed/community-colors";
import { spacing } from "@/theme";

const QUICK_EMOJIS = ["❤️", "😂", "😍", "🔥", "👏", "👍"];

export function CommentsModal({
  onClose,
  onCommentCreated,
  onOpenUser,
  postId,
  visible,
}: {
  onClose: () => void;
  onCommentCreated?: (postId: string) => void;
  onOpenUser?: (userId: string) => void;
  postId: string | null;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const {
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
    toggleCommentLike,
  } = useCommentsModal({ onClose, onCommentCreated, postId, visible });

  useEffect(() => {
    if (visible) {
      void SystemUI.setBackgroundColorAsync(colors.background);
    }
  }, [visible]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
    }
  }, [visible]);

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={close}
      statusBarTranslucent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <SafeAreaView edges={["top"]} style={styles.screen}>
          <View style={styles.keyboardView}>
            <View style={styles.header}>
              <Text style={styles.title}>Bình luận</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={close}
              >
                <Ionicons color={colors.text} name="close" size={26} />
              </Pressable>
            </View>

            {isLoading ? (
              <View style={styles.skeletonList}>
                <CommentSkeleton />
                <CommentSkeleton />
                <CommentSkeleton />
              </View>
            ) : (
              <FlatList
                contentContainerStyle={[
                  styles.listContent,
                  comments.length === 0 && styles.emptyList,
                ]}
                data={comments}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <EmptyComments
                    description={
                      errorMessage ||
                      "Bình luận mới nhất sẽ được hiển thị đầu tiên."
                    }
                    title={
                      errorMessage
                        ? "Không thể tải bình luận"
                        : "Chưa có bình luận"
                    }
                  />
                }
                ListFooterComponent={
                  isLoadingMore ? (
                    <View style={styles.footer}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : null
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.35}
                renderItem={({ item }) => (
                  <CommentItem
                    comment={item}
                    onHideReplies={() => hideReplies(item.id)}
                    onLoadMoreReplies={() =>
                      loadReplies(
                        item.id,
                        (replyStateByComment[item.id]?.page ?? 1) + 1,
                      )
                    }
                    onReply={setReplyTarget}
                    onOpenUser={onOpenUser}
                    onToggleReplies={() => loadReplies(item.id, 1)}
                    onToggleLike={toggleCommentLike}
                    replyState={replyStateByComment[item.id]}
                  />
                )}
                showsVerticalScrollIndicator={false}
                style={styles.list}
              />
            )}

            <View
              style={[
                styles.composer,
                {
                  bottom:
                    keyboardHeight > 0
                      ? Math.max(0, keyboardHeight - insets.bottom) +
                        KEYBOARD_COMPOSER_GAP
                      : 0,
                  paddingBottom:
                    keyboardHeight > 0
                      ? spacing.sm
                      : Math.max(spacing.sm, insets.bottom + spacing.xs),
                },
              ]}
            >
              {replyTarget && (
                <View style={styles.replyingBar}>
                  <Text numberOfLines={1} style={styles.replyingText}>
                    Đang trả lời {replyTarget.user.displayName}
                  </Text>
                  <Pressable onPress={() => setReplyTarget(null)}>
                    <Text style={styles.cancelReply}>Hủy</Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.emojiRow}>
                {QUICK_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() =>
                      setDraftComment((current) => `${current}${emoji}`)
                    }
                    style={styles.emojiButton}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  multiline
                  onBlur={() => setKeyboardHeight(0)}
                  onChangeText={setDraftComment}
                  placeholder={
                    replyTarget ? "Viết trả lời..." : "Viết bình luận..."
                  }
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={draftComment}
                />
                <Pressable
                  disabled={!draftComment.trim()}
                  onPress={submit}
                  style={[
                    styles.sendButton,
                    !draftComment.trim() && styles.sendButtonDisabled,
                  ]}
                >
                  <Ionicons color={colors.white} name="send" size={18} />
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function CommentItem({
  comment,
  onHideReplies,
  onLoadMoreReplies,
  onOpenUser,
  onReply,
  onToggleReplies,
  onToggleLike,
  replyState,
}: {
  comment: UiComment;
  onHideReplies: () => void;
  onLoadMoreReplies: () => void;
  onOpenUser?: (userId: string) => void;
  onReply: ReplyTargetSetter;
  onToggleLike: (commentId: string) => Promise<void>;
  onToggleReplies: () => void;
  replyState?: ReplyState;
}) {
  return (
    <View style={styles.commentGroup}>
      <CommentContent
        content={comment.content}
        isVerified={comment.user.isVerified}
        isLiked={comment.isLiked}
        likeCount={comment.likeCount}
        onLike={() => onToggleLike(comment.id)}
        onOpenUser={onOpenUser}
        onReply={() => onReply({ commentId: comment.id, user: comment.user })}
        sendStatus={comment.sendStatus}
        userAvatar={comment.user.avatarUrl}
        userName={comment.user.displayName}
        userId={comment.user.id}
      />
      {comment.replyCount > 0 && !replyState && (
        <Pressable onPress={onToggleReplies} style={styles.repliesButton}>
          <Text style={styles.replyButton}>
            Xem {comment.replyCount} trả lời
          </Text>
        </Pressable>
      )}
      {replyState && (
        <Pressable onPress={onHideReplies} style={styles.repliesButton}>
          <Text style={styles.replyButton}>Ẩn trả lời</Text>
        </Pressable>
      )}
      {replyState?.isLoading && (
        <View style={styles.replyLoading}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}
      {replyState?.items.map((reply) => (
        <View key={reply.id} style={styles.replyIndent}>
          <CommentContent
            content={reply.content}
            isVerified={reply.user.isVerified}
            isLiked={reply.isLiked}
            likeCount={reply.likeCount}
            onLike={() => onToggleLike(reply.id)}
            onOpenUser={onOpenUser}
            onReply={() => onReply({ commentId: comment.id, user: reply.user })}
            replyToUser={reply.replyToUser.displayName}
            sendStatus={reply.sendStatus}
            userAvatar={reply.user.avatarUrl}
            userName={reply.user.displayName}
            userId={reply.user.id}
          />
        </View>
      ))}
      {replyState && replyState.page < replyState.totalPages && (
        <Pressable onPress={onLoadMoreReplies} style={styles.repliesButton}>
          <Text style={styles.replyButton}>
            {replyState.isLoadingMore ? "Đang tải..." : "Xem thêm trả lời"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

type ReplyTargetSetter = (target: ReplyTarget) => void;

function CommentContent({
  content,
  isVerified,
  isLiked,
  likeCount,
  onLike,
  onOpenUser,
  onReply,
  replyToUser,
  sendStatus,
  userAvatar,
  userId,
  userName,
}: {
  content: string;
  isVerified: boolean;
  isLiked: boolean;
  likeCount: number;
  onLike: () => Promise<void>;
  onOpenUser?: (userId: string) => void;
  onReply: () => void;
  replyToUser?: string;
  sendStatus?: SendStatus;
  userAvatar: string;
  userId: string;
  userName: string;
}) {
  const isPending = sendStatus === "sending";
  const isError = sendStatus === "error";
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);

  const toggleLike = async () => {
    if (isLikeSubmitting) return;

    try {
      setIsLikeSubmitting(true);
      await onLike();
    } finally {
      setIsLikeSubmitting(false);
    }
  };

  return (
    <View style={styles.commentRow}>
      <Pressable
        accessibilityRole="button"
        disabled={!onOpenUser}
        onPress={() => onOpenUser?.(userId)}
      >
        <Image
          accessibilityLabel={`Ảnh đại diện của ${userName}`}
          source={userAvatar}
          style={styles.avatar}
        />
      </Pressable>
      <View style={styles.commentBody}>
        <View style={styles.commentBubble}>
          <View style={styles.authorRow}>
            <Pressable
              accessibilityRole="button"
              disabled={!onOpenUser}
              onPress={() => onOpenUser?.(userId)}
              style={styles.authorPressable}
            >
              <Text numberOfLines={1} style={styles.author}>
                {userName}
              </Text>
            </Pressable>
            {isVerified && (
              <Ionicons
                color={colors.verified}
                name="checkmark-circle"
                size={16}
              />
            )}
          </View>
          <Text style={styles.content}>
            {replyToUser && (
              <Text style={styles.replyMention}>@{replyToUser} </Text>
            )}
            {content}
          </Text>
        </View>
        <View style={styles.metaRow}>
          {isPending ? (
            <Text style={styles.sendingText}>Đang gửi...</Text>
          ) : isError ? (
            <Text style={styles.errorText}>Không thể gửi bình luận đi</Text>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                disabled={isLikeSubmitting}
                onPress={() => void toggleLike()}
                style={styles.likeAction}
              >
                {isLiked ? (
                  <Ionicons color={colors.primary} name="thumbs-up" size={14} />
                ) : (
                  <Text style={styles.metaText}>Thích</Text>
                )}
                {likeCount > 0 ? (
                  <Text
                    style={[
                      styles.likeCount,
                      isLiked && styles.likedCount,
                    ]}
                  >
                    {likeCount}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable onPress={onReply} style={styles.replyAction}>
                <Text style={styles.metaText}>Trả lời</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function CommentSkeleton() {
  return (
    <View style={styles.commentRow}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.commentBody}>
        <View style={styles.skeletonBubble}>
          <View style={styles.skeletonAuthor} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLineShort} />
        </View>
        <View style={styles.skeletonMeta} />
      </View>
    </View>
  );
}

function EmptyComments({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <View style={styles.centerState}>
      <Ionicons color={colors.textMuted} name="chatbubble-outline" size={38} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.centerText}>{description}</Text>
    </View>
  );
}

const AVATAR_SIZE = 42;
const KEYBOARD_COMPOSER_GAP = 90;

const styles = StyleSheet.create({
  author: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  authorPressable: { flexShrink: 1 },
  authorRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  avatar: {
    backgroundColor: colors.border,
    borderColor: colors.primary,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    height: AVATAR_SIZE,
    shadowColor: colors.glow,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 7,
    width: AVATAR_SIZE,
  },
  cancelReply: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  centerText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  commentBody: { flex: 1 },
  commentBubble: {
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  commentGroup: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    overflow: "hidden",
    paddingVertical: spacing.xs,
  },
  commentRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  composer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  content: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 3 },
  emojiButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  emojiRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  emojiText: { fontSize: 17 },
  emptyList: { flexGrow: 1 },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "700" },
  footer: { padding: spacing.md },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    maxHeight: 96,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRow: {
    alignItems: "flex-end",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: 4,
  },
  keyboardView: {
    backgroundColor: colors.background,
    flex: 1,
    position: "relative",
  },
  likeAction: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  likeCount: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  likedCount: { color: colors.primary, fontWeight: "800" },
  list: { flex: 1 },
  listContent: { paddingBottom: 132 },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  metaText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  modalRoot: { backgroundColor: colors.background, flex: 1 },
  repliesButton: { marginLeft: 62, paddingVertical: spacing.xs },
  replyButton: { color: colors.textMuted, fontSize: 13, fontWeight: "800" },
  replyAction: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  replyingBar: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  replyingText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  replyIndent: {
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    marginLeft: 34,
  },
  replyLoading: {
    alignItems: "flex-start",
    marginLeft: 62,
    paddingVertical: spacing.xs,
  },
  replyMention: { color: colors.primary, fontWeight: "800" },
  screen: { backgroundColor: colors.background, flex: 1 },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginBottom: 3,
    width: 36,
  },
  sendButtonDisabled: { opacity: 0.45 },
  sendingText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  skeletonAuthor: {
    backgroundColor: colors.border,
    borderRadius: 5,
    height: 10,
    width: 112,
  },
  skeletonAvatar: {
    backgroundColor: colors.border,
    borderRadius: AVATAR_SIZE / 2,
    height: AVATAR_SIZE,
    width: AVATAR_SIZE,
  },
  skeletonBubble: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  skeletonLine: {
    backgroundColor: colors.border,
    borderRadius: 5,
    height: 10,
    width: "86%",
  },
  skeletonLineShort: {
    backgroundColor: colors.border,
    borderRadius: 5,
    height: 10,
    width: "52%",
  },
  skeletonList: {
    backgroundColor: colors.surface,
    flex: 1,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  skeletonMeta: {
    backgroundColor: colors.border,
    borderRadius: 5,
    height: 9,
    marginLeft: spacing.md,
    marginTop: spacing.xs,
    width: 74,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
});
