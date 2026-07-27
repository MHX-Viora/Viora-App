type StartWithRetryOptions = {
  delaysMs: readonly number[];
  isConnected: () => boolean;
  onFailure?: (error: unknown, nextDelayMs: number) => void;
  shouldContinue: () => boolean;
  sleep: (delayMs: number) => Promise<void>;
  start: () => Promise<void>;
};

export const startWithRetry = async ({
  delaysMs,
  isConnected,
  onFailure,
  shouldContinue,
  sleep,
  start,
}: StartWithRetryOptions): Promise<boolean> => {
  if (delaysMs.length === 0) return false;

  let attempt = 0;
  while (shouldContinue()) {
    const delayMs = delaysMs[Math.min(attempt, delaysMs.length - 1)];
    if (delayMs > 0) {
      await sleep(delayMs);
      if (!shouldContinue()) return false;
    }

    if (isConnected()) return true;

    try {
      await start();
      return true;
    } catch (error) {
      const nextDelayMs =
        delaysMs[Math.min(attempt + 1, delaysMs.length - 1)];
      onFailure?.(error, nextDelayMs);
      attempt += 1;
    }
  }

  return false;
};
