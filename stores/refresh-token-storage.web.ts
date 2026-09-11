export const refreshTokenStorage = {
  async deleteAsync(): Promise<void> {},
  async getAsync(): Promise<string | null> {
    return null;
  },
  async setAsync(_refreshToken: string): Promise<void> {},
};
