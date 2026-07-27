import type { MentionReference, MentionUser } from "@/types/mention";

export const getMentionQuery = (value: string) => {
  const match = value.match(/(?:^|\s)@([^\s@]*)$/);
  if (!match || match.index === undefined) return null;
  const atIndex = match.index + match[0].indexOf("@");
  return { keyword: match[1], start: atIndex };
};

export const insertMention = (value: string, user: MentionUser) => {
  const query = getMentionQuery(value);
  if (!query) return value;
  return `${value.slice(0, query.start)}@${user.displayName} `;
};

export const activeMentionIds = (
  value: string,
  mentions: MentionReference[],
) =>
  mentions
    .filter((mention) => value.includes(`@${mention.displayName}`))
    .map((mention) => mention.userId);
