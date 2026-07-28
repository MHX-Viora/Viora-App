import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { searchMentionUsers } from "@/services/mention.service";
import type { MentionUser } from "@/types/mention";
import { getMentionQuery } from "@/utils/mention-composer";

export function MentionSuggestions({
  onSelect,
  searchUsers = searchMentionUsers,
  showAvatar = true,
  value,
}: {
  onSelect: (user: MentionUser) => void;
  searchUsers?: (keyword: string) => Promise<MentionUser[]>;
  showAvatar?: boolean;
  value: string;
}) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const query = getMentionQuery(value);
  const keyword = query?.keyword;

  useEffect(() => {
    let active = true;
    if (keyword === undefined) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(keyword)
        .then((items) => active && setUsers(items))
        .catch(() => active && setUsers([]));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [keyword, searchUsers]);

  if (!query || users.length === 0) return null;
  return (
    <View style={styles.container}>
      {users.slice(0, 6).map((user) => (
        <Pressable key={user.id} onPress={() => onSelect(user)} style={styles.row}>
          {showAvatar ? (
            <Image
              source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
              style={styles.avatar}
            />
          ) : null}
          <Text numberOfLines={1} style={styles.name}>{user.displayName}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 18, height: 36, width: 36 },
  container: {
    backgroundColor: "#171A21",
    borderColor: "#303744",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  name: { color: "#F7F8FA", flex: 1, fontSize: 14, fontWeight: "700" },
  row: { alignItems: "center", flexDirection: "row", gap: 10, padding: 10 },
});
