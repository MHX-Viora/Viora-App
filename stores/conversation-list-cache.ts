import type { Conversation } from "@/types/chat";

let conversations: Conversation[] = [];

export const getConversationListCache = () => conversations;

export const setConversationListCache = (items: Conversation[]) => {
  conversations = items;
};

export const clearConversationListCache = () => {
  conversations = [];
};
