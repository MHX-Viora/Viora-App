// Local acceptance fixture: real components, generated image URLs, no post/API writes.
import { useState } from "react";
import { AppRegistry, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../theme";
import { CreatePostModal } from "../components/feed/create-post-modal";
import { PostCard } from "../components/feed/post-card";
import { appendPickedImages } from "../features/feed/post-images";
import type { FeedPost } from "../types/feed";

const images = Array.from({ length: 25 }, (_, index) => `/fixtures/${index + 1}.svg`);
function Preview() {
  const [count, setCount] = useState(20);
  const [firstImage, setFirstImage] = useState(images[0]);
  const [draft, setDraft] = useState(images.slice(0, 20));
  const [composer, setComposer] = useState(false);
  const post: FeedPost = { id: "gallery-fixture", author: "ANKT", authorId: null, avatar: "", isAuthorVerified: false,
    isMine: false, link: null, location: null, publishedAt: "Vừa xong", body: `${count} ảnh theo thứ tự đã chọn`,
    images: [firstImage, ...images.slice(1, count)], isReacted: false, isSaved: false, reactionType: 0, reactions: 0, saveCount: 0,
    comments: 0, shares: 0, visibility: 0, postType: 0, viewCount: 0 };
  return <View style={{ flex: 1 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 12 }}>
      {[1, 2, 3, 4, 5, 10, 16, 20].map(value => <Pressable accessibilityRole="button" key={value} onPress={() => setCount(value)}><Text>{value} ảnh</Text></Pressable>)}
      {[["Ảnh ngang", images[0]], ["Ảnh dọc", images[2]], ["Ảnh vuông", images[1]]].map(([label, uri]) => <Pressable accessibilityRole="button" key={label} onPress={() => { setFirstImage(uri); setCount(1); }}><Text>{label}</Text></Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => { setDraft(images.slice(0, count)); setComposer(true); }}><Text>Tạo bài kiểm thử</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{ alignItems: "center", padding: 12 }}>
      <View style={{ width: "100%", maxWidth: 700 }}><PostCard post={post} /></View>
    </ScrollView>
    <CreatePostModal visible={composer} imageUris={draft} isSubmitting={false} onClose={() => setComposer(false)}
      onRemoveImage={index => setDraft(current => current.filter((_, i) => i !== index))}
      onPickImage={() => setDraft(current => appendPickedImages(current, images.filter(uri => !current.includes(uri))))}
      onSubmit={() => setComposer(false)} />
  </View>;
}
function App() { return <SafeAreaProvider><ThemeProvider><Preview /></ThemeProvider></SafeAreaProvider>; }
AppRegistry.registerComponent("GalleryAcceptance", () => App);
AppRegistry.runApplication("GalleryAcceptance", { rootTag: document.getElementById("root") });
