import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from "react-native";

import { showAppToast } from "@/components/common/app-toast";
import { getLiveCategories, type LiveCategory, type LiveSession } from "@/services/live.service";
import { type HostPrivacy, type HostSettings, validateHostSettings } from "./live-host-model";
import { HostButton, HostHeading, HostPanel, hostColors } from "./live-host-ui";

import { LiveCoverImage } from "./live-cover-image";
const privacyOptions: { value: HostPrivacy; label: string; detail: string }[] = [
  { value: "public", label: "Công khai", detail: "Mọi người đều có thể xem" },
  { value: "followers", label: "Người theo dõi", detail: "Chỉ người theo dõi" },
  { value: "friends", label: "Chỉ bạn bè", detail: "Bạn bè của bạn" },
];

export function LiveHostSetup({ settings, onChange, onContinue, onBack, activeLive, checkingActive, endingActive, onEndActive }: {
  settings: HostSettings;
  onChange: (settings: HostSettings) => void;
  onContinue: () => void;
  onBack: () => void;
  activeLive: LiveSession | null;
  checkingActive: boolean;
  endingActive: boolean;
  onEndActive: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const compact = width <= 767;
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [categoriesError, setCategoriesError] = useState(false);
  useEffect(() => {
    let active = true;
    void getLiveCategories().then((items) => { if (active) setCategories(items); }).catch(() => { if (active) setCategoriesError(true); });
    return () => { active = false; };
  }, []);
  const error = validateHostSettings(settings);
  const update = <K extends keyof HostSettings>(key: K, value: HostSettings[K]) => onChange({ ...settings, [key]: value });

  const pickCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.85 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        showAppToast({ title: "Ảnh quá lớn", message: "Vui lòng chọn ảnh dưới 10 MB.", type: "error" });
        return;
      }
      update("coverUri", asset.uri);
    } catch {
      showAppToast({ title: "Không thể chọn ảnh", message: "Vui lòng thử lại.", type: "error" });
    }
  };

  const continueSetup = () => {
    if (checkingActive || activeLive) return;
    if (error) {
      showAppToast({ title: "Thiếu thông tin Live", message: error === "title" ? "Nhập tiêu đề Live tối đa 100 ký tự." : "Chọn danh mục cho buổi Live.", type: "error" });
      return;
    }
    onContinue();
  };

  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <HostHeading title="Tạo buổi phát trực tiếp" subtitle="Thiết lập thông tin trước khi lên sóng" onBack={onBack} />
        {activeLive ? <HostPanel style={styles.recoveryPanel}>
          <Text style={styles.recoveryTitle}>Bạn đang có buổi Live chưa kết thúc</Text>
          <Text style={styles.recoveryText} numberOfLines={2}>{activeLive.title}</Text>
          <Text style={styles.recoveryText}>Nếu đã thoát khỏi buổi Live này, hãy kết thúc để tạo buổi mới.</Text>
          <Pressable accessibilityRole="button" disabled={endingActive} onPress={onEndActive} style={styles.recoveryButton}>
            <Text style={styles.recoveryButtonText}>{endingActive ? "Đang kết thúc..." : "Kết thúc Live cũ"}</Text>
          </Pressable>
        </HostPanel> : null}
        <View style={[styles.columns, wide && styles.columnsWide]}>
          <View style={[styles.previewColumn, wide && styles.previewColumnWide]}>
            <HostPanel style={styles.coverPanel}>
              <View style={styles.coverFrame}>
                <LiveCoverImage fill source={settings.coverUri} />
                <View style={styles.coverShade} />
                <View style={styles.coverCopy}><Text style={styles.coverEyebrow}>ẢNH BÌA LIVE</Text><Text numberOfLines={2} style={styles.coverTitle}>{settings.title.trim() || "Buổi Live của bạn"}</Text></View>
              </View>
              <View style={styles.coverActions}>
                <View style={styles.coverInfo}><Text style={styles.coverActionTitle}>Ảnh bìa Live</Text><Text style={styles.hint}>Ảnh JPG/PNG, tối đa 10 MB</Text></View>
                <Pressable accessibilityRole="button" onPress={() => void pickCover()} style={styles.coverButton}><Ionicons color={hostColors.text} name="image-outline" size={18} /><Text style={styles.coverButtonText}>Thay ảnh</Text></Pressable>
              </View>
            </HostPanel>
            {wide ? <Text style={styles.previewNote}>Xem trước ảnh bìa. Video camera sẽ xuất hiện ở bước kiểm tra thiết bị.</Text> : null}
          </View>
          <HostPanel style={styles.formPanel}>
            <FieldLabel label="Tiêu đề Live" required />
            <TextInput accessibilityLabel="Tiêu đề Live" maxLength={100} onChangeText={(value) => update("title", value)} placeholder="Bạn muốn chia sẻ điều gì hôm nay?" placeholderTextColor={hostColors.muted} style={styles.input} value={settings.title} />
            <Text style={styles.counter}>{settings.title.length}/100</Text>

            <FieldLabel label="Danh mục" required />
            {categoriesError ? <Text style={styles.hint}>Không tải được danh mục Live. Vui lòng mở lại màn hình.</Text> : null}
            <View style={styles.topicGrid}>{categories.map((category) => <Pressable accessibilityRole="button" accessibilityState={{ selected: settings.categoryId === category.id }} hitSlop={compact ? 2 : undefined} key={category.id} onPress={() => onChange({ ...settings, topic: category.name, categoryId: category.id })} style={[styles.topic, settings.categoryId === category.id && styles.topicSelected, compact && styles.topicCompact]}><Ionicons color={settings.categoryId === category.id ? hostColors.cyan : hostColors.muted} name="grid-outline" size={compact ? 16 : 17} /><Text style={[styles.topicText, compact && styles.topicTextCompact]}>{category.name}</Text></Pressable>)}</View>


            <FieldLabel label="Quyền riêng tư" />
            <View style={styles.privacyRow}>{privacyOptions.map((option) => <Pressable accessibilityRole="button" accessibilityState={{ selected: settings.privacy === option.value }} key={option.value} onPress={() => update("privacy", option.value)} style={[styles.privacy, settings.privacy === option.value && styles.privacySelected]}><Ionicons color={settings.privacy === option.value ? hostColors.cyan : hostColors.muted} name={option.value === "public" ? "globe-outline" : option.value === "followers" ? "people-outline" : "heart-outline"} size={17} /><View style={styles.privacyCopy}><Text style={styles.privacyTitle}>{option.label}</Text><Text style={styles.privacyDetail}>{option.detail}</Text></View></Pressable>)}</View>

            <FieldLabel label="Tương tác" />
            <SettingSwitch icon="chatbubble-outline" label="Cho phép bình luận" value={settings.allowComments} onChange={(value) => update("allowComments", value)} />
            <SettingSwitch icon="gift-outline" label="Cho phép tặng quà" value={settings.allowGifts} onChange={(value) => update("allowGifts", value)} />

          </HostPanel>
        </View>
      </View>
    </ScrollView>
    <View style={styles.footer}><View style={styles.footerInner}><Text style={styles.footerNote}>Bước 1 / 3 · Thiết lập Live</Text><HostButton label="Tiếp tục" icon="arrow-forward" disabled={checkingActive || Boolean(activeLive)} onPress={continueSetup} style={styles.footerButton} /></View></View>
  </View>;
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>;
}

function SettingSwitch({ label, icon, value, onChange }: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.setting}><Ionicons color={hostColors.purple} name={icon} size={20} /><Text style={styles.settingLabel}>{label}</Text><Switch accessibilityLabel={label} onValueChange={onChange} thumbColor="#FFFFFF" trackColor={{ false: hostColors.border, true: hostColors.cyan }} value={value} /></View>;
}

const styles = StyleSheet.create({
  recoveryPanel: { marginTop: 18, gap: 8, borderColor: hostColors.cyan },
  recoveryTitle: { color: hostColors.text, fontSize: 16, fontWeight: "800" },
  recoveryText: { color: hostColors.muted, fontSize: 13 },
  recoveryButton: { alignSelf: "flex-start", backgroundColor: hostColors.cyan, borderRadius: 10, marginTop: 6, paddingHorizontal: 18, paddingVertical: 10 },
  recoveryButtonText: { color: hostColors.background, fontWeight: "800" },
  root: { backgroundColor: hostColors.background, flex: 1 },
  scrollContent: { paddingBottom: 22, paddingHorizontal: 16, paddingTop: 20 },
  container: { alignSelf: "center", maxWidth: 1060, width: "100%" },
  columns: { gap: 16, marginTop: 18 },
  columnsWide: { flexDirection: "row" },
  previewColumn: { width: "100%" },
  previewColumnWide: { flex: 0.86, minWidth: 0 },
  coverPanel: { overflow: "hidden" },
  coverFrame: { aspectRatio: 16 / 9, backgroundColor: hostColors.surfaceRaised, position: "relative" },
  coverShade: { backgroundColor: "rgba(5, 13, 25, 0.22)", ...StyleSheet.absoluteFillObject },
  coverCopy: { bottom: 16, left: 16, position: "absolute", right: 16 },
  coverEyebrow: { color: hostColors.cyan, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  coverTitle: { color: hostColors.text, fontSize: 21, fontWeight: "800", marginTop: 5 },
  coverActions: { alignItems: "center", flexDirection: "row", gap: 10, padding: 14 },
  coverInfo: { flex: 1 },
  coverActionTitle: { color: hostColors.text, fontSize: 14, fontWeight: "800" },
  hint: { color: hostColors.muted, fontSize: 11, marginTop: 4 },
  coverButton: { alignItems: "center", backgroundColor: hostColors.surfaceRaised, borderColor: hostColors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: 12 },
  coverButtonText: { color: hostColors.text, fontSize: 12, fontWeight: "700" },
  previewNote: { color: hostColors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  formPanel: { flex: 1.14, minWidth: 0, padding: 16 },
  label: { color: hostColors.text, fontSize: 13, fontWeight: "800", marginBottom: 8, marginTop: 12 },
  required: { color: hostColors.pink },
  input: { backgroundColor: hostColors.background, borderColor: hostColors.border, borderRadius: 10, borderWidth: 1, color: hostColors.text, fontSize: 13, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  counter: { color: hostColors.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  topicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  topic: { alignItems: "center", backgroundColor: hostColors.surfaceRaised, borderColor: hostColors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 44, paddingHorizontal: 10 },
  topicCompact: { borderRadius: 9, gap: 5, minHeight: 40, paddingHorizontal: 7 },
  topicSelected: { borderColor: hostColors.cyan },
  topicText: { color: hostColors.text, fontSize: 12, fontWeight: "700" },
  topicTextCompact: { fontSize: 11 },
  privacyRow: { flexDirection: "row", gap: 6 },
  privacy: { backgroundColor: hostColors.surfaceRaised, borderColor: hostColors.border, borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: "row", gap: 5, minHeight: 59, padding: 7 },
  privacySelected: { borderColor: hostColors.cyan },
  privacyCopy: { flex: 1, minWidth: 0 },
  privacyTitle: { color: hostColors.text, fontSize: 10, fontWeight: "800" },
  privacyDetail: { color: hostColors.muted, fontSize: 9, lineHeight: 12, marginTop: 2 },
  setting: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 42 },
  settingLabel: { color: hostColors.text, flex: 1, fontSize: 12, fontWeight: "700" },
  footer: { backgroundColor: hostColors.background, borderTopColor: hostColors.border, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  footerInner: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 16, justifyContent: "space-between", maxWidth: 1060, width: "100%" },
  footerNote: { color: hostColors.muted, fontSize: 11 },
  footerButton: { minWidth: 155 },
});
