import type { ProfileInput } from "../types/auth";

const getFileName = (uri: string, fallbackName: string) => {
  const fileName = uri.split(/[?#]/)[0].split("/").pop();
  return fileName && fileName.includes(".") ? fileName : fallbackName;
};

const getFileType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
};

const appendImage = async (
  formData: FormData,
  fieldName: "Avatar" | "Cover",
  uri: string | undefined,
  isWeb: boolean,
) => {
  if (!uri) return;
  if (isWeb) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Không thể đọc ảnh hồ sơ đã chọn.");
    const image = await response.blob();
    const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    formData.append(fieldName, image, getFileName(uri, `${fieldName.toLowerCase()}.${extension}`));
    return;
  }

  const fileName = getFileName(uri, `${fieldName.toLowerCase()}.jpg`);
  formData.append(fieldName, {
    uri,
    name: fileName,
    type: getFileType(fileName),
  } as unknown as Blob);
};

export const buildProfileFormData = async (
  payload: ProfileInput,
  isWeb: boolean,
): Promise<FormData> => {
  const formData = new FormData();
  formData.append("DisplayName", payload.displayName);
  formData.append("Gender", String(payload.gender));
  await appendImage(formData, "Avatar", payload.avatarUrl, isWeb);
  await appendImage(formData, "Cover", payload.coverUrl, isWeb);
  return formData;
};
