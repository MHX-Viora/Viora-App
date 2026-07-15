import { authenticatedFetch } from "@/services/authenticated-fetch";
import type { ProfileInput, UpdateProfileInput, User } from "@/types/auth";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const FORM_HEADERS = {
  Accept: "application/json",
};

type ApiError = {
  message?: unknown;
  title?: unknown;
  status?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isUser = (value: unknown): value is User => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.accountId === "string" &&
    typeof value.displayName === "string" &&
    typeof value.avatarUrl === "string" &&
    typeof value.coverUrl === "string" &&
    typeof value.role === "number" &&
    typeof value.isVerified === "boolean" &&
    typeof value.verificationStatus === "number"
  );
};

const getFileName = (uri: string, fallbackName: string) => {
  const fileName = uri.split("/").pop();
  return fileName && fileName.includes(".") ? fileName : fallbackName;
};

const getFileType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
};

const appendImage = (formData: FormData, fieldName: string, uri: string) => {
  const fileName = getFileName(uri, `${fieldName.toLowerCase()}.jpg`);

  formData.append(fieldName, {
    uri,
    name: fileName,
    type: getFileType(fileName),
  } as unknown as Blob);
};

export const createProfile = async (payload: ProfileInput): Promise<User> => {
  const formData = new FormData();
  formData.append("DisplayName", payload.displayName);
  formData.append("Gender", String(payload.gender));
  appendImage(formData, "Avatar", payload.avatarUrl);
  appendImage(formData, "Cover", payload.coverUrl);

  // Gọi API tạo hồ sơ bằng multipart/form-data để upload avatar và cover.
  const response = await authenticatedFetch(`${BASE_URL}/api/users/profile`, {
    method: "POST",
    headers: FORM_HEADERS,
    body: formData,
  });

  const data = await response.json();

  // API lỗi thì throw message cho màn hình hiển thị.
  if (!response.ok || (isRecord(data) && data.status === 0)) {
    const error = data as ApiError;
    let message = "Không thể lưu hồ sơ.";

    if (typeof error.message === "string" && error.message.trim()) {
      message = error.message;
    } else if (typeof error.title === "string" && error.title.trim()) {
      message = error.title;
    }

    throw new Error(message);
  }

  //  API tạo hồ sơ phải trả về user.
  if (!isUser(data)) {
    throw new Error("Phản hồi hồ sơ không hợp lệ.");
  }

  return data;
};

export const updateProfile = async (
  payload: UpdateProfileInput,
): Promise<User> => {
  const formData = new FormData();
  formData.append("DisplayName", payload.displayName);
  formData.append("Gender", String(payload.gender));

  if (payload.avatarUrl) {
    appendImage(formData, "Avatar", payload.avatarUrl);
  }

  if (payload.coverUrl) {
    appendImage(formData, "Cover", payload.coverUrl);
  }

  // Gọi API cập nhật hồ sơ bằng multipart/form-data để upload avatar và cover.
  const response = await authenticatedFetch(`${BASE_URL}/api/users/profile`, {
    method: "PATCH",
    headers: FORM_HEADERS,
    body: formData,
  });

  const data = await response.json();

  // API lỗi thì throw message cho màn hình hiển thị.
  if (!response.ok || (isRecord(data) && data.status === 0)) {
    const error = data as ApiError;
    let message = "Không thể cập nhật hồ sơ.";

    if (typeof error.message === "string" && error.message.trim()) {
      message = error.message;
    } else if (typeof error.title === "string" && error.title.trim()) {
      message = error.title;
    }

    throw new Error(message);
  }

  // API cập nhật hồ sơ phải trả về user.
  if (!isUser(data)) {
    throw new Error("Phản hồi hồ sơ không hợp lệ.");
  }

  return data;
};
