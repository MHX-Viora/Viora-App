import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "viora.refresh-token";

export const refreshTokenStorage = {
  deleteAsync: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  getAsync: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setAsync: (refreshToken: string) =>
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
};
