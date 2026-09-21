import type { ProfileInput } from "../types/auth";

const fileExtension = (contentType: string) => {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
};

const fileType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
};

const appendImage = async (
  form: FormData,
  field: "Avatar" | "Cover",
  uri: string,
  isWeb: boolean,
  fetchImage: (uri: string) => Promise<Response>,
) => {
  if (isWeb) {
    const response = await fetchImage(uri);
    if (!response.ok) throw new Error("Không thể đọc ảnh đã chọn.");
    const blob = await response.blob();
    const type = blob.type || "image/jpeg";
    form.append(field, blob, `${field.toLowerCase()}.${fileExtension(type)}`);
    return;
  }

  const lastPath = uri.split(/[?#]/, 1)[0].split("/").pop();
  const name = lastPath?.includes(".") ? lastPath : `${field.toLowerCase()}.jpg`;
  form.append(field, { uri, name, type: fileType(name) } as unknown as Blob);
};

export const buildProfileFormData = async (
  payload: ProfileInput,
  isWeb: boolean,
  fetchImage: (uri: string) => Promise<Response> = fetch,
  form: FormData = new FormData(),
): Promise<FormData> => {
  form.append("DisplayName", payload.displayName);
  form.append("Gender", String(payload.gender));
  if (payload.avatarUrl) {
    await appendImage(form, "Avatar", payload.avatarUrl, isWeb, fetchImage);
  }
  if (payload.coverUrl) {
    await appendImage(form, "Cover", payload.coverUrl, isWeb, fetchImage);
  }
  return form;
};
