import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { showAppToast } from '@/components/common/app-toast';
import { followUser, getUserProfile } from '@/services/user.service';
import { spacing, type ThemeColors, useTheme } from '@/theme';

export function ArticleAuthorFollowButton({ authorId }: { authorId: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const active = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    active.current = true;
    let current = true;
    setLoading(true);
    setLoadFailed(false);
    void getUserProfile(authorId).then(profile => { if (current) setFollowing(profile.isFollowing); })
      .catch(() => { if (current) setLoadFailed(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; active.current = false; };
  }, [authorId, retry]);

  const toggle = async () => {
    if (loading || inFlight.current) return;
    if (loadFailed) { setRetry(value => value + 1); return; }
    if (following === null) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const result = await followUser(authorId);
      if (active.current) setFollowing(result.isFollowing);
    } catch {
      if (active.current) showAppToast({ title: 'Không thể cập nhật theo dõi', message: 'Vui lòng thử lại.', type: 'error' });
    } finally {
      inFlight.current = false;
      if (active.current) setSaving(false);
    }
  };

  return <Pressable accessibilityRole="button"
    accessibilityLabel={loadFailed ? 'Thử tải trạng thái theo dõi' : following ? 'Bỏ theo dõi tác giả' : 'Theo dõi tác giả'}
    accessibilityState={{ busy: loading || saving, selected: following === true }}
    disabled={loading || saving} onPress={() => void toggle()}
    style={({ pressed }) => [styles.button, following && styles.following, (pressed || saving) && styles.pressed]}
  >{loading || saving ? <ActivityIndicator size="small" color={theme.colors.primary} />
      : <Text style={styles.label}>{loadFailed ? 'Thử lại' : following ? 'Đang theo dõi' : 'Theo dõi'}</Text>}</Pressable>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: { minWidth: 92, minHeight: 36, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  following: { backgroundColor: colors.surface },
  label: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
