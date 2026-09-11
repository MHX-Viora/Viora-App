export * from "./chat-local-repository.types";
export { createMemoryChatLocalRepository } from "./chat-local-repository.memory";

import { createMemoryChatLocalRepository } from "./chat-local-repository.memory";

// Node/test fallback. Metro resolves the .native/.web implementation first.
export const chatLocalRepository = createMemoryChatLocalRepository();
