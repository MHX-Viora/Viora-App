import type { ComponentProps } from "react";
import { Text } from "react-native";

import type { MentionReference } from "@/types/mention";
import { useTheme } from "@/theme";

export function MentionText({
  mentions = [],
  children,
  ...props
}: ComponentProps<typeof Text> & {
  mentions?: MentionReference[];
  children: string;
}) {
  const { theme } = useTheme();
  const names = mentions.map((item) => item.displayName).filter(Boolean);
  const matcher = names.length
    ? new RegExp(
        `(@(?:${names
          .sort((a, b) => b.length - a.length)
          .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")}))`,
        "g",
      )
    : null;
  if (!matcher) return <Text {...props}>{children}</Text>;
  return (
    <Text {...props}>
      {children.split(matcher).map((part, index) =>
        part.startsWith("@") && names.includes(part.slice(1)) ? (
          <Text key={`${part}-${index}`} style={{ color: theme.colors.primary, fontWeight: "700" }}>
            {part}
          </Text>
        ) : part,
      )}
    </Text>
  );
}
