import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputProps } from 'react-native';

export function ArticleBlockTextInput({ style, value, ...props }: TextInputProps) {
  const input = useRef<TextInput>(null);
  const flattened = StyleSheet.flatten(style);
  const minimumHeight = typeof flattened?.minHeight === 'number' ? flattened.minHeight : 48;
  const [contentHeight, setContentHeight] = useState(minimumHeight);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = input.current as unknown as HTMLTextAreaElement | null;
    if (!element) return;
    // Measuring offscreen preserves the list scrollbar and the input's wrap width.
    const mirror = document.createElement('textarea');
    mirror.className = element.className;
    mirror.tabIndex = -1;
    mirror.setAttribute('aria-hidden', 'true');
    Object.assign(mirror.style, {
      position: 'fixed', left: '-10000px', top: '0', height: '0', minHeight: '0',
      maxHeight: 'none', maxWidth: 'none', visibility: 'hidden', overflow: 'hidden', pointerEvents: 'none',
    });
    document.body.appendChild(mirror);
    const resize = () => {
      const computed = getComputedStyle(element);
      Object.assign(mirror.style, {
        width: `${element.getBoundingClientRect().width}px`, boxSizing: computed.boxSizing,
        font: computed.font, letterSpacing: computed.letterSpacing, lineHeight: computed.lineHeight,
        padding: computed.padding, borderWidth: computed.borderWidth, borderStyle: computed.borderStyle,
        whiteSpace: computed.whiteSpace, overflowWrap: computed.overflowWrap, wordBreak: computed.wordBreak,
      });
      mirror.value = element.value;
      const borders = parseFloat(computed.borderTopWidth) + parseFloat(computed.borderBottomWidth);
      element.style.height = `${Math.max(minimumHeight, Math.ceil(mirror.scrollHeight + borders))}px`;
    };
    resize();
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = element.getBoundingClientRect().width;
      if (Math.abs(nextWidth - width) > 0.5) { width = nextWidth; resize(); }
    });
    observer.observe(element);
    return () => { observer.disconnect(); mirror.remove(); };
  }, [value, minimumHeight]);

  return <TextInput
    {...props} ref={input} value={value} multiline scrollEnabled={false}
    onContentSizeChange={Platform.OS === 'web' ? undefined : event => setContentHeight(Math.ceil(event.nativeEvent.contentSize.height))}
    style={[style, { overflow: 'hidden' }, Platform.OS !== 'web' && { height: Math.max(minimumHeight, contentHeight) }]}
  />;
}
