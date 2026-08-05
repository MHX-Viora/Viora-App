export const createTokenRefreshCoordinator = (
  refresh: () => Promise<string>,
  getCurrentToken: () => Promise<string | null>,
): ((rejectedToken: string) => Promise<string>) => {
  let activeRefresh: Promise<string> | null = null;

  return async (rejectedToken) => {
    if (activeRefresh) return activeRefresh;

    const currentToken = await getCurrentToken();
    if (currentToken && currentToken !== rejectedToken) return currentToken;

    if (!activeRefresh) {
      activeRefresh = refresh().finally(() => {
        activeRefresh = null;
      });
    }

    return activeRefresh;
  };
};
