let refreshToken: string | null = null;

export const refreshTokenStorage = {
  async deleteAsync(): Promise<void> {
    refreshToken = null;
  },
  async getAsync(): Promise<string | null> {
    return refreshToken;
  },
  async setAsync(value: string): Promise<void> {
    refreshToken = value;
  },
};
