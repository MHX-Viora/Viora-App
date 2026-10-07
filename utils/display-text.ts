/** Presentation only: never apply to editor values, stored content or code blocks. */
export function withoutHashtags(text: string | null | undefined): string {
  if (!text) return "";
  // A standalone token needs a letter/underscore: retain numeric references and URL fragments.
  const tag = /(^|[\s(\[{])#[\p{L}\p{M}\p{N}_]*[\p{L}_][\p{L}\p{M}\p{N}_]*/gu;
  if (!tag.test(text)) return text;
  tag.lastIndex = 0;
  return text.replace(tag, "$1").replace(/[ \t]+(?=\r?$)/gm, "").trim();
}
