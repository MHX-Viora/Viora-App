import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MemberPicker } from "@/components/chat/member-picker";
import { showAppToast } from "@/components/common/app-toast";
import {
  addGroupMembers,
  getGroupMembers,
} from "@/services/chat.service";
import { spacing } from "@/theme";
import type { SelectableFriend } from "@/types/chat-group";
import { type ThemeColors, useTheme } from "@/theme";


const MEMBER_PAGE_SIZE = 100;

export function AddMembersModal({
  conversationId,
  onAdded,
  onClose,
  visible,
}: {
  conversationId: string;
  onAdded?: () => void;
  onClose: () => void;
  visible: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedMembers, setSelectedMembers] = useState<
    Record<string, SelectableFriend>
  >({});
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [adding, setAdding] = useState(false);
  const lockedMemberIds = useMemo(() => new Set<string>(), []);
  const selectedIds = useMemo(
    () => Object.keys(selectedMembers),
    [selectedMembers],
  );

  const loadExistingMembers = useCallback(async () => {
    if (!visible || !conversationId) return;
    setLoadingMembers(true);
    try {
      const ids = new Set<string>();
      let nextPage = 1;
      let totalPages = 1;
      do {
        const page = await getGroupMembers(conversationId, {
          page: nextPage,
          pageSize: MEMBER_PAGE_SIZE,
        });
        page.items.forEach((member) => ids.add(member.id));
        totalPages = page.totalPages;
        nextPage += 1;
      } while (nextPage <= totalPages);
      setExistingMemberIds(ids);
    } catch (error) {
      Alert.alert(
        "Không thể tải thành viên",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setLoadingMembers(false);
    }
  }, [conversationId, visible]);

  useEffect(() => {
    if (!visible) {
      setSelectedMembers({});
      setExistingMemberIds(new Set());
      setAdding(false);
      return;
    }
    void loadExistingMembers();
  }, [loadExistingMembers, visible]);

  const submit = async () => {
    if (selectedIds.length === 0) {
      Alert.alert("Chưa chọn thành viên", "Vui lòng chọn bạn bè cần thêm.");
      return;
    }

    setAdding(true);
    try {
      await addGroupMembers(conversationId, selectedIds);
      showAppToast({ message: "Đã thêm thành viên vào nhóm.", type: "success" });
      onAdded?.();
      onClose();
    } catch (error) {
      Alert.alert(
        "Không thể thêm thành viên",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Đóng"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={styles.headerButton}
          >
            <Ionicons color={colors.text} name="close" size={24} />
          </Pressable>
          <Text numberOfLines={1} style={styles.headerTitle}>
            Thêm thành viên
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={adding || loadingMembers}
            onPress={submit}
            style={styles.addButton}
          >
            {adding ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.addText}>Thêm</Text>
            )}
          </Pressable>
        </View>

        {loadingMembers ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <MemberPicker
            disabledLabel="Đã trong nhóm"
            disabledMemberIds={existingMemberIds}
            lockedMemberIds={lockedMemberIds}
            selectedMembers={selectedMembers}
            setSelectedMembers={setSelectedMembers}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  addButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
  },
  addText: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
  headerButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  loading: {
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: "center",
  },
  screen: { backgroundColor: colors.surface, flex: 1 },
});

