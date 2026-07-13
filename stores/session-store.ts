import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { createSessionStore } from "./session-store-core";

let webSession: string | null = null;

const webMemoryStorage = {
  async deleteItemAsync() { webSession = null; },
  async getItemAsync() { return webSession; },
  async setItemAsync(_key: string, value: string) { webSession = value; },
};

export const sessionStore = createSessionStore(
  Platform.OS === "web" ? webMemoryStorage : SecureStore,
);
