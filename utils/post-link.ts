const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

export const normalizePostLink = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text) return null;

  const candidate = URL_SCHEME_PATTERN.test(text)
    ? text
    : `https://${text}`;

  try {
    const parsed = new URL(candidate);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !parsed.hostname
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
};
