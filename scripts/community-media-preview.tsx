// Real display components with local edge-labelled fixtures; no posting/API mutations.
import { registerRootComponent } from "expo";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme";
import { PostCard } from "../components/feed/post-card";
import { ArticleBlockView } from "../components/article/article-renderer";
import { ArticleBlockType } from "../types/article";
import type { FeedPost } from "../types/feed";
import { ProfileContent } from "../components/profile/profile-content";

const ratios = [[800,450],[450,800],[600,600],[800,600],[600,800],[1050,450]];
const uri = (w: number, h: number) => `http://localhost:3000/assets/?unstable_path=.%2F.codex-tmp%2Fmedia-${w}-${h}.png`;
function Preview() {
  const { theme, setMode } = useTheme();
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [profileMode, setProfileMode] = useState(false);
  const [accountStyle, setAccountStyle] = useState(2);
  const [w,h] = ratios[index];
  const source = failed ? "http://localhost:3000/missing-media.png" : uri(w,h);
  const base: FeedPost = { id: "acceptance-post", author: "ANKT", authorId: null, avatar: "", isAuthorVerified: false,
    isMine: false, link: null, location: null, publishedAt: "Vừa xong", body: "Ảnh đầy đủ bốn mép #du_lich",
    images: [source], isReacted: false, isSaved: false, reactionType: 0, reactions: 0, saveCount: 0,
    comments: 0, shares: 0, visibility: 0, postType: 0, viewCount: 0 };
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8 }}>
      {ratios.map(([x,y], i) => <Pressable accessibilityRole="button" key={i} onPress={() => { setIndex(i); setFailed(false); }}><Text style={{ color: theme.colors.text }}>{x}x{y}</Text></Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => setFailed(true)}><Text style={{ color: theme.colors.text }}>404</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => void setMode(theme.isDark ? "classic" : "modern")}><Text style={{ color: theme.colors.text }}>Theme</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setProfileMode(value => !value)}><Text style={{ color: theme.colors.text }}>Profile</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setAccountStyle(value => value === 0 ? 2 : 0)}><Text style={{ color: theme.colors.text }}>Author/Personal</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{ alignItems: "center", padding: 12, gap: 16 }}>
      <View style={{ width: "100%", maxWidth: 700, gap: 16 }}>
        {profileMode ? <ProfileContent accountStyle={accountStyle} stats={[]} reels={[]}
          posts={[base, { ...base, id: "news", postType: 2, images: [], article: { title: "Bài báo #tin_tức", thumbnailUrl: source, preview: "Nội dung #news", readingTimeMinutes: 2 } }]} /> : <>
        <PostCard post={base} />
        <PostCard post={{ ...base, id: "gallery", images: [source, uri(450,800)] }} />
        <PostCard variant="news" post={{ ...base, id: "news", postType: 2, images: [], article: { title: "Bài báo #tin_tức", thumbnailUrl: source, preview: "Nội dung #news", readingTimeMinutes: 2 } }} />
        <ArticleBlockView block={{ type: ArticleBlockType.Image, orderIndex: 0, mediaUrl: source, caption: "Ảnh trong bài báo #news" }} />
        </>}
      </View>
    </ScrollView>
  </View>;
}
function App() { return <SafeAreaProvider><ThemeProvider><Preview /></ThemeProvider></SafeAreaProvider>; }
registerRootComponent(App);
