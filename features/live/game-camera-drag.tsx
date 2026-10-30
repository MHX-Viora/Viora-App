import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { getHostVideoFrame } from './host-video-frame';
import { moveGameCamera, type GameCameraPosition, type gameStreamLayout } from './game-stream-layout';

type Layout = ReturnType<typeof gameStreamLayout>;

export function GameCameraDrag({ layout, onMove }: { layout: Layout; onMove(position: GameCameraPosition): void }) {
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const frame = getHostVideoFrame(stage, layout);
  const current = useRef({ layout, onMove, frame });
  const origin = useRef({ layout, scale: 1 });
  current.current = { layout, onMove, frame };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => {
      const value = current.current;
      origin.current = { layout: value.layout, scale: (value.frame?.width ?? value.layout.width) / value.layout.width };
    },
    onPanResponderMove: (_, gesture) => {
      current.current.onMove(moveGameCamera(origin.current.layout, gesture.dx / origin.current.scale, gesture.dy / origin.current.scale));
    },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const cycleCorner = () => {
    const position = moveGameCamera(layout, 0, 0);
    const corners = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const index = position.y < .5 ? (position.x < .5 ? 0 : 1) : (position.x < .5 ? 3 : 2);
    onMove(corners[(index + 1) % corners.length]);
  };
  const scale = frame ? frame.width / layout.width : 1;
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={event => setStage(event.nativeEvent.layout)}>
    {frame ? <View testID="game-camera-drag" {...responder.panHandlers} style={[styles.target, {
      left: frame.left + layout.inset.x * scale, top: frame.top + layout.inset.y * scale,
      width: layout.inset.width * scale, height: layout.inset.height * scale,
    }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đổi góc camera" accessibilityHint="Kéo khung camera để di chuyển, hoặc nhấn để đổi góc" onPress={cycleCorner} style={styles.cornerAction} />
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  target: { position: 'absolute', borderColor: 'rgba(255,255,255,.7)', borderWidth: 1, borderRadius: 12, touchAction: 'none' } as ViewStyle,
  cornerAction: { position: 'absolute', left: 0, top: 0, width: 24, height: 24 },
});
