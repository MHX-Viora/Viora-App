import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Sticker } from "@/types/sticker";
import { parseRecentStickers, promoteRecentSticker } from "./recent-stickers";

const KEY = "ankt.chat.recent-stickers.v1";

const read = async () => {
  if (Platform.OS === "web") {
    try { return globalThis.localStorage?.getItem(KEY) ?? null; } catch { return null; }
  }
  return AsyncStorage.getItem(KEY);
};

const write = async (value: string) => {
  if (Platform.OS === "web") {
    try { globalThis.localStorage?.setItem(KEY, value); } catch { /* unavailable */ }
    return;
  }
  await AsyncStorage.setItem(KEY, value);
};

export const getRecentStickers = async () => parseRecentStickers(await read());

export const rememberSticker = async (sticker: Sticker) => {
  const next = promoteRecentSticker(await getRecentStickers(), sticker);
  await write(JSON.stringify(next));
  return next;
};
