import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const artwork = require('../../assets/images/ankt-live-banner-red.png');

export function LiveDiscoveryBanner() {
  const [width, setWidth] = useState(0);
  const compact = width > 0 && width < 520;
  return <View testID="live-discovery-banner" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.banner, compact && styles.bannerCompact]}>
    <Image accessible={false} importantForAccessibility="no-hide-descendants" source={artwork} resizeMode="cover" style={styles.artwork} />
    <View style={[styles.copy, compact && styles.copyCompact]}>
      <View style={styles.eyebrow}>
        <Ionicons name="radio" size={13} color="#FFB4AA" />
        <Text style={styles.eyebrowText}>ANKT LIVE</Text>
      </View>
      <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>Xem live – Gặp gỡ – Kết nối</Text>
      <Text style={[styles.description, compact && styles.descriptionCompact]}>Khám phá những buổi livestream hấp dẫn từ cộng đồng ANKT.</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  banner: { width: '100%', backgroundColor: '#640D12', borderColor: '#8D2428', borderWidth: 1, borderRadius: 16, overflow: 'hidden', minHeight: 188, aspectRatio: 4.1, justifyContent: 'center' },
  bannerCompact: { aspectRatio: undefined, minHeight: 168 },
  artwork: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  copy: { width: '60%', padding: 24, gap: 10 },
  copyCompact: { width: '66%', padding: 16, gap: 8 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrowText: { color: '#FFB4AA', fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 26, lineHeight: 33, fontWeight: '800' },
  titleCompact: { fontSize: 20, lineHeight: 26 },
  description: { color: '#FFE1DC', fontSize: 13, lineHeight: 20, maxWidth: 470 },
  descriptionCompact: { fontSize: 12, lineHeight: 18 },
});
