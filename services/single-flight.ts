export const createSingleFlight = () => {
  const requests = new Map<string, Promise<unknown>>();

  return {
    run<T>(key: string, request: () => Promise<T>): Promise<T> {
      const existing = requests.get(key);
      if (existing) return existing as Promise<T>;

      const promise = request().finally(() => {
        if (requests.get(key) === promise) requests.delete(key);
      });
      requests.set(key, promise);
      return promise;
    },
  };
};

