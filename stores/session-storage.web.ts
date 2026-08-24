type BrowserStorage = {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

export const createWebSessionStorage = (
  getBrowserStorage: () => BrowserStorage = () => globalThis.sessionStorage,
) => {
  const fallback = new Map<string, string>();

  const resolveStorage = () => {
    try {
      return getBrowserStorage();
    } catch {
      return null;
    }
  };

  return {
    async deleteItemAsync(key: string): Promise<void> {
      fallback.delete(key);
      try {
        resolveStorage()?.removeItem(key);
      } catch {
        // Private browsing and storage policies may reject writes.
      }
    },
    async getItemAsync(key: string): Promise<string | null> {
      try {
        return resolveStorage()?.getItem(key) ?? fallback.get(key) ?? null;
      } catch {
        return fallback.get(key) ?? null;
      }
    },
    async setItemAsync(key: string, value: string): Promise<void> {
      fallback.set(key, value);
      try {
        resolveStorage()?.setItem(key, value);
      } catch {
        // Keep the in-memory fallback for the current browser session.
      }
    },
  };
};

export const sessionStorage = createWebSessionStorage();
