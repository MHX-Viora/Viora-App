import { scanFromURLAsync } from "expo-camera";
import * as ImagePicker from "expo-image-picker";

export type QrImageScanResult =
  | { status: "cancelled" }
  | { status: "not-found" }
  | { data: string; status: "found" };

export const scanQrFromDeviceImage = async (): Promise<QrImageScanResult> => {
  const selection = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: false,
    mediaTypes: ["images"],
    quality: 1,
  });
  if (selection.canceled || !selection.assets[0]?.uri) {
    return { status: "cancelled" };
  }

  const results = await scanFromURLAsync(selection.assets[0].uri, ["qr"]);
  const value = results.find((result) => result.data.trim())?.data.trim();
  return value
    ? { data: value, status: "found" }
    : { status: "not-found" };
};
