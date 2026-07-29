import { useMemo } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { spacing, type ThemeColors, useTheme } from "@/theme";

export function MarkdownContent({ content }: { content: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let code: string[] | null = null;
  const inline = (value: string) => {
    const parts = value.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
    return <Text>{parts.map((part, index) => {
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) return <Text key={index} accessibilityRole="link" onPress={() => void Linking.openURL(link[2])} style={styles.link}>{link[1]}</Text>;
      if (part.startsWith("**") && part.endsWith("**")) return <Text key={index} style={styles.bold}>{part.slice(2, -2)}</Text>;
      if (part.startsWith("*") && part.endsWith("*")) return <Text key={index} style={styles.italic}>{part.slice(1, -1)}</Text>;
      if (part.startsWith("`") && part.endsWith("`")) return <Text key={index} style={styles.inlineCode}>{part.slice(1, -1)}</Text>;
      return part;
    })}</Text>;
  };
  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (code) { nodes.push(<ScrollView horizontal key={`code-${index}`} style={styles.code}><Text style={styles.codeText}>{code.join("\n")}</Text></ScrollView>); code = null; } else code = [];
      return;
    }
    if (code) { code.push(line); return; }
    if (!line.trim()) return;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { const level = heading[1].length; nodes.push(<Text accessibilityRole="header" key={index} style={level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3}>{inline(heading[2])}</Text>); return; }
    const list = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (list) { nodes.push(<View key={index} style={styles.listRow}><Text style={styles.marker}>{list[2]}</Text><Text style={styles.body}>{inline(list[3])}</Text></View>); return; }
    if (line.startsWith("> ")) { nodes.push(<Text key={index} style={styles.quote}>{inline(line.slice(2))}</Text>); return; }
    if (line.includes("|")) { nodes.push(<ScrollView horizontal key={index}><Text style={styles.table}>{line}</Text></ScrollView>); return; }
    nodes.push(<Text key={index} style={styles.body}>{inline(line)}</Text>);
  });
  return <View style={styles.root}>{nodes}</View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { gap: spacing.sm }, h1: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: spacing.md }, h2: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: spacing.md }, h3: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  body: { color: colors.text, flex: 1, fontSize: 15, lineHeight: 23 }, bold: { fontWeight: "800" }, italic: { fontStyle: "italic" }, link: { color: colors.primary, textDecorationLine: "underline" }, inlineCode: { backgroundColor: colors.surfaceElevated, fontFamily: "monospace" },
  listRow: { flexDirection: "row", gap: spacing.sm, paddingLeft: spacing.sm }, marker: { color: colors.textMuted, minWidth: 20 }, quote: { borderLeftColor: colors.primary, borderLeftWidth: 3, color: colors.textMuted, fontStyle: "italic", paddingLeft: spacing.md },
  code: { backgroundColor: colors.surfaceElevated, borderRadius: 8, padding: spacing.md }, codeText: { color: colors.text, fontFamily: "monospace", fontSize: 13 }, table: { borderColor: colors.border, borderWidth: 1, color: colors.text, fontFamily: "monospace", padding: spacing.sm },
});
