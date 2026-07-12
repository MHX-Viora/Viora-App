const BASE64_IMAGE_PREFIX = /^data:image\/[^;]+;base64,/i;

export function createPickedImageUri(
  base64: string | null | undefined,
  fallbackUri: string,
) {
  return base64 ? `data:image/jpeg;base64,${base64}` : fallbackUri;
}

export function normalizeFeedImageUri(uri: string) {
  return uri.startsWith("data:image/")
    ? uri.replace(BASE64_IMAGE_PREFIX, "data:image/jpeg;base64,")
    : uri;
}
