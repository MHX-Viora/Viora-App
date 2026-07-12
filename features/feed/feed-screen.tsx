import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, FlatList, Platform, StyleSheet, View } from "react-native";

import { CreatePostModal } from "@/components/feed/create-post-modal";
import { FeedSearchModal } from "@/components/feed/feed-search-modal";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { FIXED_TOP_BAR_HEIGHT } from "@/components/layout/fixed-top-bar";
import { feedPosts as initialPosts } from "@/features/feed/data";
import { createPickedImageUri } from "@/features/feed/image-source";
import { colors } from "@/theme";
import type { FeedPost } from "@/types/feed";

export function FeedScreen() {
  const [posts, setPosts] = useState(initialPosts);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [draftImages, setDraftImages] = useState<string[]>([]);

  const pickImages = async (): Promise<string[] | null> => {
    if (Platform.OS !== "web") {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập",
          "Hãy cho phép Viora truy cập thư viện ảnh để chọn ảnh đăng bài.",
        );
        return null;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      base64: true,
      mediaTypes: ["images"],
      quality: 0.75,
      selectionLimit: 4,
    });
    if (result.canceled) return null;
    const selectedUris = result.assets
      .slice(0, 4)
      .map((asset) => createPickedImageUri(asset.base64, asset.uri));
    setDraftImages(selectedUris);
    return selectedUris;
  };

  const closeModal = () => {
    setModalVisible(false);
    setDraftImages([]);
  };
  const createPost = (body: string) => {
    const post: FeedPost = {
      id: `local-${Date.now()}`,
      author: "Bạn",
      avatar: initialPosts[0].avatar,
      location: "Việt Nam",
      publishedAt: "Vừa xong",
      body,
      images: draftImages,
      reactions: 0,
      comments: 0,
      shares: 0,
    };
    setPosts((current) => [post, ...current]);
    closeModal();
  };
  const openWithImagePicker = async () => {
    const selectedUris = await pickImages();
    if (selectedUris) setModalVisible(true);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
      />
      <PostComposer
        avatar={initialPosts[0].avatar}
        onCreatePress={() => setModalVisible(true)}
        onImagePress={openWithImagePicker}
        onSearchPress={() => setSearchVisible(true)}
      />
      <CreatePostModal
        imageUris={draftImages}
        onClose={closeModal}
        onPickImage={pickImages}
        onSubmit={createPost}
        visible={modalVisible}
      />
      <FeedSearchModal
        onClose={() => setSearchVisible(false)}
        posts={posts}
        visible={searchVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 10, paddingTop: FIXED_TOP_BAR_HEIGHT },
  screen: { backgroundColor: colors.background, flex: 1 },
});
