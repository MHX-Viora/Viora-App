import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import type { LayoutChangeEvent } from "react-native";
import { Alert, AppState, FlatList, Platform, StyleSheet, View } from "react-native";

import { CreateReelModal } from "@/components/reels/create-reel-modal";
import type { SelectedVideo } from "@/components/reels/create-reel-modal";
import { ReelCard } from "@/components/reels/reel-card";
import { ReelsHeader } from "@/components/reels/reels-header";
import { ReelsSearchModal } from "@/components/reels/reels-search-modal";
import { reels } from "@/features/reels/data";
import { colors } from "@/theme";
import type { Reel } from "@/types/reel";

export function ReelsScreen() {
  const isFocused = useIsFocused();
  const reelsListRef = useRef<FlatList<Reel>>(null);
  const [reelItems, setReelItems] = useState(reels);
  const [reelHeight, setReelHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active");
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setIsAppActive(state === "active"));
    return () => subscription.remove();
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight !== reelHeight) setReelHeight(nextHeight);
  };

  const handleInteractionLockChange = useCallback((locked: boolean) => {
    setIsInteractionLocked(locked);
  }, []);

  const pickVideo = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Cần quyền truy cập", "Hãy cho phép Viora truy cập thư viện để chọn video đăng Reels.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setSelectedVideo({ duration: asset.duration ?? null, name: asset.fileName ?? "video-da-chon.mp4", uri: asset.uri });
  };

  const closeCreate = () => {
    setCreateVisible(false);
    setSelectedVideo(null);
  };

  const createReel = (caption: string, hashtags: string) => {
    if (!selectedVideo) return;
    const newReel: Reel = {
      id: `local-${Date.now()}`,
      author: "ban",
      avatar: reels[0].avatar,
      caption: caption || "Video mới của tôi",
      hashtags,
      videoUrl: selectedVideo.uri,
      sourceSize: "Video đã tải lên",
      likes: "0",
      comments: "0",
    };
    setReelItems((current) => [newReel, ...current]);
    setActiveIndex(0);
    closeCreate();
    requestAnimationFrame(() => reelsListRef.current?.scrollToOffset({ animated: false, offset: 0 }));
  };

  return (
    <View onLayout={handleLayout} style={styles.container}>
      {reelHeight > 0 && (
        <FlatList
          data={reelItems}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            index,
            length: reelHeight,
            offset: reelHeight * index,
          })}
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={(event) =>
            setActiveIndex(
              Math.round(event.nativeEvent.contentOffset.y / reelHeight),
            )
          }
          pagingEnabled
          ref={reelsListRef}
          renderItem={({ index, item }) => (
            <ReelCard
              active={isAppActive && isFocused && !searchVisible && !createVisible && index === activeIndex}
              height={reelHeight}
              onInteractionLockChange={
                index === activeIndex ? handleInteractionLockChange : undefined
              }
              reel={item}
            />
          )}
          scrollEnabled={!isInteractionLocked}
          showsVerticalScrollIndicator={false}
        />
      )}
      <ReelsHeader onCreatePress={() => setCreateVisible(true)} onSearchPress={() => setSearchVisible(true)} />
      <ReelsSearchModal onClose={() => setSearchVisible(false)} reels={reelItems} visible={searchVisible} />
      <CreateReelModal onClose={closeCreate} onPickVideo={pickVideo} onSubmit={createReel} selectedVideo={selectedVideo} visible={createVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.reelBackground, flex: 1 },
});
