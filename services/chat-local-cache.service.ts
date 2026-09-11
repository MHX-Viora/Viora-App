import {
  chatLocalRepository,
  messageCursor,
} from "@/data/chat-local/chat-local-repository";
import { enqueueLocalMutation } from "@/data/chat-local/chat-local-write-coordinator";
import { getUser } from "@/stores/session-store";
import type { ChatMessage, Conversation } from "@/types/chat";

const logCacheError = (operation: string, error: unknown) => {
  if (!__DEV__) return;
  console.info("[CHAT CACHE] local database fallback", {
    operation,
    message: error instanceof Error ? error.message : String(error),
  });
};

const ownerId = async () => (await getUser().catch(() => null))?.id ?? null;

const withOwner = async <T>(
  operation: string,
  fallback: T,
  run: (id: string) => Promise<T>,
) => {
  try {
    const id = await ownerId();
    if (!id) return fallback;
    await chatLocalRepository.initialize();
    return await run(id);
  } catch (error) {
    logCacheError(operation, error);
    return fallback;
  }
};

export const readRecentLocalMessages = (conversationId: string, limit: number) =>
  withOwner("read-recent-messages", [] as ChatMessage[], (id) =>
    chatLocalRepository.getRecentMessages(id, conversationId, limit),
  );

export const readOlderLocalMessages = (
  conversationId: string,
  oldestMessage: ChatMessage,
  limit: number,
) => withOwner("read-older-messages", [] as ChatMessage[], (id) =>
  chatLocalRepository.getOlderMessages(id, conversationId, messageCursor(oldestMessage), limit),
);

export const persistLocalMessages = (messages: ChatMessage[]) =>
  enqueueLocalMutation(() => withOwner("write-messages", undefined, (id) =>
    chatLocalRepository.upsertMessages(id, messages),
  ));

export const persistLocalMessageChanges = (
  previous: ChatMessage[],
  next: ChatMessage[],
) => enqueueLocalMutation(() => withOwner("write-message-delta", undefined, async (id) => {
  const previousById = new Map(previous.map((message) => [message.id, message]));
  const nextIds = new Set(next.map((message) => message.id));
  const changed = next.filter((message) => previousById.get(message.id) !== message);
  if (changed.length > 0) await chatLocalRepository.upsertMessages(id, changed);
  for (const message of previous) {
    if (!nextIds.has(message.id)) await chatLocalRepository.removeMessage(id, message.id);
  }
}));

export const replaceLocalMessage = (optimisticId: string, confirmed: ChatMessage) =>
  enqueueLocalMutation(() => withOwner("replace-message", undefined, (id) =>
    chatLocalRepository.replaceMessage(id, optimisticId, confirmed),
  ));

export const removeLocalMessage = (messageId: string) =>
  enqueueLocalMutation(() => withOwner("remove-message", undefined, (id) =>
    chatLocalRepository.removeMessage(id, messageId),
  ));

export const readLocalConversations = () =>
  withOwner("read-conversations", [] as Conversation[], (id) =>
    chatLocalRepository.getConversations(id),
  );

export const persistLocalConversations = (conversations: Conversation[]) =>
  enqueueLocalMutation(() => withOwner("write-conversations", undefined, (id) =>
    chatLocalRepository.upsertConversations(id, conversations),
  ));

export const persistLocalConversation = (conversation: Conversation) =>
  enqueueLocalMutation(() => withOwner("write-conversation", undefined, (id) =>
    chatLocalRepository.upsertConversation(id, conversation),
  ));

export const removeLocalConversation = (conversationId: string) =>
  enqueueLocalMutation(() => withOwner("remove-conversation", undefined, (id) =>
    chatLocalRepository.removeConversation(id, conversationId),
  ));
