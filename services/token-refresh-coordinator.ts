type TokenRefreshExclusiveRunner = <T>(operation: () => Promise<T>) => Promise<T>;

const runDirectly: TokenRefreshExclusiveRunner = (operation) => operation();

export const createTokenRefreshCoordinator = (
  refresh: () => Promise<string>,
  getCurrentToken: (rejectedToken: string) => Promise<string | null>,
  runExclusive: TokenRefreshExclusiveRunner = runDirectly,
): ((rejectedToken: string) => Promise<string>) => {
  let activeRefresh: Promise<string> | null = null;

  return async (rejectedToken) => {
    if (activeRefresh) return activeRefresh;

    if (!activeRefresh) {
      activeRefresh = runExclusive(async () => {
        const lockedCurrentToken = await getCurrentToken(rejectedToken);
        if (lockedCurrentToken && lockedCurrentToken !== rejectedToken) {
          return lockedCurrentToken;
        }
        return refresh();
      }).finally(() => {
        activeRefresh = null;
      });
    }

    return activeRefresh;
  };
};
