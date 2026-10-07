import type { ImageProps } from "expo-image";

export function normalizeLiveCoverSource(source: ImageProps["source"]): ImageProps["source"] | undefined {
  if (typeof source === "number") return source > 0 ? source : undefined;
  if (typeof source === "string") return source.trim() || undefined;
  if (source && !Array.isArray(source) && "uri" in source && typeof source.uri === "string" && source.uri.trim()) {
    return { ...source, uri: source.uri.trim() };
  }
  return undefined;
}

export function liveCoverSourceKey(source: ImageProps["source"]): string {
  const normalized = normalizeLiveCoverSource(source);
  if (typeof normalized === "number") return `asset:${normalized}`;
  if (typeof normalized === "string") return normalized;
  return normalized && "uri" in normalized ? String(normalized.uri) : "";
}
