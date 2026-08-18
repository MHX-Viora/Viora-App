import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useState, useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { ViewableImage } from "@/components/common/viewable-image";
import { scanQrFromDeviceImage } from "@/services/qr-image-scanner";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";
import { parseProfileQrValue } from "@/utils/qr-code";


export function ProfileQrModal({
  avatar,
  handle,
  name,
  onClose,
  onOpenProfile,
  qrValue,
  visible,
}: {
  avatar: string;
  handle: string;
  name: string;
  onClose: () => void;
  onOpenProfile?: (userId: string) => void;
  qrValue: string;
  visible: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMessage, setScanMessage] = useState("");
  const [scanning, setScanning] = useState(true);
  const [selectingImage, setSelectingImage] = useState(false);

  const resetScanner = () => {
    setScanMessage("");
    setScanning(true);
  };

  const closeModal = () => {
    setShowScanner(false);
    resetScanner();
    onClose();
  };

  const openScanner = () => {
    resetScanner();
    setShowScanner(true);
  };

  const processScannedData = (data: string) => {
    setScanning(false);
    const profileId = parseProfileQrValue(data);
    const isProfile = profileId !== null;

    if (profileId) {
      setTimeout(() => {
        closeModal();
        onOpenProfile?.(profileId);
      }, 450);
    }
    setScanMessage(
      isProfile
        ? "Đã tìm thấy hồ sơ ANKT"
        : "Mã QR này không phải hồ sơ ANKT",
    );
  };

  const handleScanned = ({ data }: { data: string }) => {
    if (!scanning) return;
    processScannedData(data);
  };

  const handleSelectQrImage = async () => {
    if (selectingImage) return;
    setSelectingImage(true);
    try {
      const result = await scanQrFromDeviceImage();
      if (result.status === "found") {
        processScannedData(result.data);
      } else if (result.status === "not-found") {
        setScanning(false);
        setScanMessage("Không tìm thấy mã QR trong ảnh đã chọn");
      }
    } catch {
      setScanning(false);
      setScanMessage("Không thể đọc ảnh QR. Vui lòng chọn ảnh khác");
    } finally {
      setSelectingImage(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={closeModal}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
    >
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <StatusBar backgroundColor={colors.surface} style="dark" translucent />
        <View style={styles.header}>
          {showScanner ? (
            <Pressable
              accessibilityLabel="Quay lại mã QR của tôi"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setShowScanner(false)}
              style={styles.headerAction}
            >
              <Ionicons color={colors.text} name="arrow-back" size={25} />
            </Pressable>
          ) : (
            <View style={styles.headerAction} />
          )}
          <Text style={styles.title}>
            {showScanner ? "Quét QR hồ sơ" : "QR của tôi"}
          </Text>
          <Pressable
            accessibilityLabel="Đóng QR hồ sơ"
            accessibilityRole="button"
            hitSlop={10}
            onPress={closeModal}
            style={styles.headerAction}
          >
            <Ionicons color={colors.text} name="close" size={27} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {showScanner ? (
            <Scanner
              permissionGranted={permission?.granted === true}
              onRequestPermission={requestPermission}
              onScan={handleScanned}
              onScanAgain={resetScanner}
              onSelectImage={handleSelectQrImage}
              scanMessage={scanMessage}
              scanning={scanning}
              selectingImage={selectingImage}
            />
          ) : (
            <View style={styles.myQrContent}>
            <View style={styles.intro}>
              <Text style={styles.introTitle}>Kết nối nhanh hơn</Text>
              <Text style={styles.introText}>
                Đưa mã này cho bạn bè quét để mở hồ sơ của bạn
              </Text>
            </View>

            <View style={styles.qrCard}>
              <ViewableImage
                accessibilityLabel={`Ảnh đại diện của ${name}`}
                source={avatar}
                style={styles.avatar}
              />
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.handle}>{handle}</Text>
              <View style={styles.qrWrap}>
                <QRCode
                  backgroundColor={colors.qrBackground}
                  color={colors.qrForeground}
                  size={210}
                  value={qrValue}
                />
              </View>
              <View style={styles.brandRow}>
                <View style={styles.brandDot} />
                <Text style={styles.brand}>VIORA</Text>
              </View>
            </View>

            <Pressable
              accessibilityHint="Mở camera để quét QR hồ sơ của người khác"
              accessibilityLabel="Quét QR người khác"
              accessibilityRole="button"
              onPress={openScanner}
              style={({ pressed }) => [
                styles.scanButton,
                pressed && styles.scanButtonPressed,
              ]}
            >
              <Ionicons color={colors.white} name="camera" size={25} />
            </Pressable>
            <Text style={styles.scanButtonLabel}>Quét QR</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Scanner({
  onRequestPermission,
  onScan,
  onScanAgain,
  onSelectImage,
  permissionGranted,
  scanMessage,
  scanning,
  selectingImage,
}: {
  onRequestPermission: () => void;
  onScan: (result: { data: string }) => void;
  onScanAgain: () => void;
  onSelectImage: () => void;
  permissionGranted: boolean;
  scanMessage: string;
  scanning: boolean;
  selectingImage: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!permissionGranted) {
    return (
      <View style={styles.permissionState}>
        <View style={styles.permissionIcon}>
          <Ionicons color={colors.primary} name="camera-outline" size={42} />
        </View>
        <Text style={styles.permissionTitle}>Cho phép truy cập camera</Text>
        <Text style={styles.permissionText}>
          ANKT chỉ dùng camera để đọc mã QR hồ sơ
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRequestPermission}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Mở camera</Text>
        </Pressable>
        <GalleryQrButton
          onPress={onSelectImage}
          selecting={selectingImage}
        />
      </View>
    );
  }

  return (
    <View style={styles.scannerContent}>
      <Text style={styles.scannerHelp}>Đặt mã QR vào giữa khung hình</Text>
      <View style={styles.cameraWrap}>
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanning ? onScan : undefined}
          style={styles.camera}
        />
        <View pointerEvents="none" style={styles.scanShade} />
        <View pointerEvents="none" style={styles.scanFrame} />
        {!!scanMessage && (
          <View style={styles.scanResult}>
            <Ionicons
              color={
                scanMessage.startsWith("Đã") ? colors.primary : colors.danger
              }
              name={
                scanMessage.startsWith("Đã")
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={25}
            />
            <Text style={styles.scanResultText}>{scanMessage}</Text>
            <Pressable accessibilityRole="button" onPress={onScanAgain}>
              <Text style={styles.scanAgain}>Quét lại</Text>
            </Pressable>
          </View>
        )}
      </View>
      <GalleryQrButton
        onPress={onSelectImage}
        selecting={selectingImage}
      />
    </View>
  );
}

function GalleryQrButton({
  onPress,
  selecting,
}: {
  onPress: () => void;
  selecting: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityLabel="Chọn ảnh QR"
      accessibilityRole="button"
      disabled={selecting}
      onPress={onPress}
      style={styles.galleryButton}
    >
      <Ionicons color={colors.primary} name="image-outline" size={20} />
      <Text style={styles.galleryButtonText}>
        {selecting ? "Đang đọc ảnh..." : "Chọn ảnh QR"}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: {
    borderColor: colors.white,
    borderRadius: 31,
    borderWidth: 3,
    height: 62,
    width: 62,
  },
  brand: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  brandDot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  body: { backgroundColor: colors.background, flex: 1 },
  camera: { flex: 1 },
  cameraWrap: {
    borderRadius: 24,
    height: 460,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  galleryButton: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  galleryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  handle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerAction: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  intro: { alignItems: "center", marginBottom: spacing.lg },

  introText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
    maxWidth: 280,
    textAlign: "center",
  },
  introTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  myQrContent: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  name: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  permissionState: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 100,
  },
  permissionText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  permissionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: spacing.xl,
    paddingHorizontal: 32,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.primaryContrast,
    fontSize: 15,
    fontWeight: "700",
  },
  qrCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
  },
  qrWrap: {
    backgroundColor: colors.qrBackground,
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  scanAgain: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  scanButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    marginTop: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    width: 56,
  },
  scanButtonLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  scanButtonPressed: { opacity: 0.82, transform: [{ scale: 0.95 }] },
  scanFrame: {
    borderColor: colors.white,
    borderRadius: 22,
    borderWidth: 3,
    height: 230,
    left: "17%",
    position: "absolute",
    top: 90,
    width: "66%",
  },
  scanResult: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    bottom: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
    left: spacing.lg,
    padding: spacing.md,
    position: "absolute",
    right: spacing.lg,
  },
  scanResultText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  scanShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.visuals.rgb_8_16_26_0_14,
  },
  scannerContent: { flex: 1, padding: spacing.lg },
  scannerHelp: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  screen: { backgroundColor: colors.surface, flex: 1 },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
});
