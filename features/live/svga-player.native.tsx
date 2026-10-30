import { WebView } from 'react-native-webview';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SvgaPlayerProps } from './svga-player';
import { svgaHtml, svgaSource } from './svga-source';

export function SvgaPlayer({ url, onFinished, style, fillWidth = false }: SvgaPlayerProps) {
  const html = useMemo(() => svgaHtml(url, fillWidth), [url, fillWidth]);
  const baseUrl = svgaSource('/');
  return <View pointerEvents="none" style={style}><WebView source={{ html, baseUrl }} style={styles.webview}
    originWhitelist={['*']} javaScriptEnabled scrollEnabled={false} bounces={false} opaque={false}
    allowsInlineMediaPlayback mixedContentMode="never" setSupportMultipleWindows={false}
    onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url === baseUrl}
    onMessage={event => { if (event.nativeEvent.data === 'done') onFinished(); }} onError={onFinished} />
  </View>;
}
const styles = StyleSheet.create({ webview: { flex: 1, backgroundColor: 'transparent' } });
