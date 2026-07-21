import { useCallback, useState } from "react";

const PAGE_SIZE = 20;

type Loader<T> = (params: {
  page: number;
  pageSize: number;
}) => Promise<{ items: T[]; totalPages: number }>;

export const useProfileActivityList = <T extends { id: string }>(
  loader: Loader<T>,
) => {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextPage = 1, mode: "initial" | "refresh" | "more" = "initial") => {
      if (isLoading || isRefreshing || isLoadingMore) return;
      if (mode === "more" && (page >= totalPages || !hasLoaded)) return;

      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      if (mode === "more") setIsLoadingMore(true);

      try {
        const result = await loader({ page: nextPage, pageSize: PAGE_SIZE });
        setItems((current) =>
          nextPage === 1
            ? result.items
            : [
                ...current,
                ...result.items.filter(
                  (item) => !current.some((existing) => existing.id === item.id),
                ),
              ],
        );
        setPage(nextPage);
        setTotalPages(result.totalPages);
        setHasLoaded(true);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [hasLoaded, isLoading, isLoadingMore, isRefreshing, loader, page, totalPages],
  );

  const refresh = useCallback(() => load(1, "refresh"), [load]);
  const loadMore = useCallback(() => load(page + 1, "more"), [load, page]);
  const ensureLoaded = useCallback(() => {
    if (!hasLoaded && !isLoading) void load(1, "initial");
  }, [hasLoaded, isLoading, load]);
  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const updateItem = useCallback(
    (id: string, next: Partial<T> | ((item: T) => T)) => {
      setItems((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          return typeof next === "function" ? next(item) : { ...item, ...next };
        }),
      );
    },
    [],
  );

  return {
    error,
    hasLoaded,
    isLoading,
    isLoadingMore,
    isRefreshing,
    items,
    ensureLoaded,
    load,
    loadMore,
    refresh,
    removeItem,
    updateItem,
  };
};
