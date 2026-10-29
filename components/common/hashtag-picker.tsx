import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState, type Ref } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchHashtags } from '@/services/reel.service';
import { spacing, type ThemeColors, useTheme } from '@/theme';
import type { Hashtag } from '@/types/reel';
import { mergePendingHashtags, normalizeHashtag } from '@/utils/hashtag-selection';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  selected: Hashtag[];
  onChange: (value: Hashtag[]) => void;
  inputLabel?: string;
  inputRef?: Ref<TextInput>;
  label?: string;
  customHint?: string;
  showPopular?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
};

export function HashtagPicker({ query, onQueryChange, selected, onChange, inputRef, inputLabel = 'Tìm hashtag video', label = 'Hashtag', customHint = 'Thêm hashtag này vào video', showPopular = false, autoFocus = false, disabled = false }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [suggestions, setSuggestions] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const keyword = normalizeHashtag(query);
  const showSuggestions = showPopular || Boolean(keyword);
  useEffect(() => {
    let active = true;
    if (!showSuggestions) { setSuggestions([]); setLoading(false); setError(''); return; }
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      void searchHashtags({ keyword, page: 1, pageSize: 8 }).then(tags => {
        if (active) setSuggestions(tags);
      }).catch(() => {
        if (active) { setSuggestions([]); setError('Không thể tìm hashtag lúc này. Vui lòng thử lại.'); }
      }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [keyword, showSuggestions]);

  const add = (tag: Hashtag | string) => {
    if (disabled) return;
    onChange(typeof tag === 'string' ? mergePendingHashtags(selected, tag) : mergePendingHashtags([...selected, tag], ''));
    onQueryChange('');
  };
  const available = suggestions.filter(tag => !selected.some(item => normalizeHashtag(item.name) === normalizeHashtag(tag.name)));
  return <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.box}>
      {selected.length > 0 ? <View style={styles.chips}>{selected.map(tag => <Pressable
        key={tag.id} accessibilityRole="button" accessibilityLabel={`Xóa hashtag ${tag.name}`} disabled={disabled}
        onPress={() => onChange(selected.filter(item => normalizeHashtag(item.name) !== normalizeHashtag(tag.name)))} style={styles.chip}
      ><Text style={styles.chipText}>#{tag.name}</Text><Ionicons color={theme.colors.primary} name="close" size={14} /></Pressable>)}</View> : null}
      <TextInput ref={inputRef} accessibilityLabel={inputLabel} autoCapitalize="none" autoCorrect={false} autoFocus={autoFocus} editable={!disabled}
        maxLength={80} onChangeText={onQueryChange} onSubmitEditing={() => add(query)} placeholder="Tìm hoặc nhập hashtag"
        placeholderTextColor={theme.colors.placeholder} returnKeyType="done" style={styles.input} value={query} />
    </View>
    {showSuggestions ? <View style={styles.suggestions}>
      {loading ? <View style={styles.state}><ActivityIndicator color={theme.colors.primary} size="small" /><Text style={styles.muted}>Đang tìm hashtag...</Text></View> : error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : <>
        {available.map(tag => <Pressable key={tag.id} accessibilityLabel={`Chọn hashtag ${tag.name}`} accessibilityRole="button" disabled={disabled} onPress={() => add(tag)} style={styles.suggestion}>
          <View style={styles.hash}><Text style={styles.hashText}>#</Text></View>
          <View style={styles.copy}><Text style={styles.name}>#{tag.name.replace(/^#/, '')}</Text><Text style={styles.muted}>{tag.postCount} bài viết</Text></View>
          <Ionicons color={theme.colors.textMuted} name="add" size={18} />
        </Pressable>)}
        {!keyword && available.length === 0 ? <Text style={styles.muted}>Nhập hashtag để tìm hoặc thêm chủ đề.</Text> : null}
      </>}
      {keyword && !loading && !suggestions.some(tag => normalizeHashtag(tag.name) === keyword) && !selected.some(tag => normalizeHashtag(tag.name) === keyword) ? <Pressable accessibilityLabel={`Dùng hashtag ${keyword}`} accessibilityRole="button" disabled={disabled} onPress={() => add(keyword)} style={styles.suggestion}>
        <View style={styles.hash}><Text style={styles.hashText}>#</Text></View><View style={styles.copy}><Text style={styles.name}>Dùng #{keyword}</Text><Text style={styles.muted}>{customHint}</Text></View><Ionicons color={theme.colors.textMuted} name="add" size={18} />
      </Pressable> : null}
    </View> : null}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: spacing.sm }, label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.input, padding: spacing.sm, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primarySoft, borderRadius: 20, paddingHorizontal: spacing.sm, minHeight: 36 },
  chipText: { color: colors.primary, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  input: { color: colors.text, fontSize: 14, minHeight: 44, paddingHorizontal: spacing.xs },
  suggestions: { gap: spacing.xs }, suggestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56, paddingVertical: spacing.sm },
  hash: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft },
  hashText: { color: colors.primary, fontSize: 20, fontWeight: '700' }, copy: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' }, muted: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  state: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.md }, error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
});
