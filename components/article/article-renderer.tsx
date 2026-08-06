import { VideoView, useVideoPlayer } from "expo-video";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { ViewableImage } from "@/components/common/viewable-image";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";
import { ArticleBlockType, type ArticleBlock } from "@/types/article";
import { useMemo, useState } from "react";

function ArticleVideo({ block }: { block: ArticleBlock }) {
  const player = useVideoPlayer(block.mediaUrl || null);
  return <VideoView nativeControls player={player} style={stylesStatic.video} />;
}

function ArticleImage({ block }: { block: ArticleBlock }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [aspectRatio, setAspectRatio] = useState(16 / 10);

  return (
    <View>
      <ViewableImage
        accessibilityLabel={block.caption || "Ảnh trong bài báo"}
        contentFit="contain"
        onLoad={({ source }) => {
          if (source.width > 0 && source.height > 0) {
            setAspectRatio(source.width / source.height);
          }
        }}
        recyclingKey={block.id}
        source={{ uri: block.mediaUrl || "" }}
        style={[styles.image, { aspectRatio }]}
      />
      {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
    </View>
  );
}

export function ArticleBlockView({ block }: { block: ArticleBlock }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  switch (block.type) {
    case ArticleBlockType.Heading:
      return <Text style={styles.heading}>{block.content}</Text>;
    case ArticleBlockType.Text:
      return <Text style={styles.paragraph}>{block.content}</Text>;
    case ArticleBlockType.Image:
      return <ArticleImage block={block} />;
    case ArticleBlockType.Video:
      return <View><ArticleVideo block={block} />{block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}</View>;
    case ArticleBlockType.Quote:
      return <View style={styles.quote}><Text style={styles.quoteText}>{block.content}</Text></View>;
    case ArticleBlockType.Divider:
      return <View style={styles.divider} />;
    case ArticleBlockType.Code:
      return <View style={styles.code}><Text selectable style={styles.codeText}>{block.content}</Text></View>;
    case ArticleBlockType.Embed:
      return <Pressable accessibilityRole="link" onPress={() => block.content && Linking.openURL(block.content)} style={styles.embed}><Text numberOfLines={2} style={styles.embedText}>{block.content}</Text></Pressable>;
    default:
      return null;
  }
}

const stylesStatic = StyleSheet.create({ video: { aspectRatio: 16 / 9, width: "100%" } });
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  caption: { color: colors.textMuted, fontSize: 13, marginTop: 6, textAlign: "center" },
  code: { backgroundColor: colors.secondaryBackground, borderRadius: 10, padding: spacing.md },
  codeText: { color: colors.text, fontFamily: "monospace", fontSize: 14, lineHeight: 21 },
  divider: { backgroundColor: colors.divider, height: 1, marginVertical: spacing.md },
  embed: { backgroundColor: colors.primarySoft, borderColor: colors.border, borderRadius: 10, borderWidth: 1, padding: spacing.md },
  embedText: { color: colors.primary, fontSize: 15 },
  heading: { color: colors.text, fontSize: 25, fontWeight: "800", lineHeight: 32 },
  image: { width: "100%" },
  paragraph: { color: colors.text, fontSize: 18, lineHeight: 29 },
  quote: { borderLeftColor: colors.primary, borderLeftWidth: 4, paddingLeft: spacing.md, paddingVertical: spacing.xs },
  quoteText: { color: colors.text, fontSize: 19, fontStyle: "italic", lineHeight: 28 },
});
