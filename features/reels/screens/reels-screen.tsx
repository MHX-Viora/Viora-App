import { useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import type { LayoutChangeEvent } from "react-native";
import { AppState, FlatList, StyleSheet, View } from "react-native";

import { ReelCard } from "@/components/reels/reel-card";
import { ReelsHeader } from "@/components/reels/reels-header";
import { reels } from "@/features/reels/data";
import { colors } from "@/theme";

export function ReelsScreen() {
  const isFocused = useIsFocused();
  const [reelHeight, setReelHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setIsAppActive(state === "active"));
    return () => subscription.remove();
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight !== reelHeight) setReelHeight(nextHeight);
  };

  return (
    <View onLayout={handleLayout} style={styles.container}>
      {reelHeight > 0 && (
        <FlatList
          data={reels}
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
          renderItem={({ index, item }) => (
            <ReelCard
              active={isAppActive && isFocused && index === activeIndex}
              height={reelHeight}
              reel={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <ReelsHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.reelBackground, flex: 1 },
});
