import { isUser, readApiResponse } from "@/services/api-response";
import { fetchWithRefresh } from "@/services/authenticated-fetch";
import type { ProfileInput, User } from "@/types/auth";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export const createProfile = async (
  accessToken: string,
  payload: ProfileInput,
): Promise<User> => {
  const response = await fetchWithRefresh(
    `${BASE_URL}/api/users/profile`,
    accessToken,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
  const data = await readApiResponse(response, "Không thể lưu hồ sơ.");

  if (!isUser(data)) {
    throw new Error("Phản hồi hồ sơ không hợp lệ.");
  }
  return data;
};

export const updateProfile = async (
  accessToken: string,
  payload: ProfileInput,
): Promise<User> => {
  const response = await fetchWithRefresh(
    `${BASE_URL}/api/users/profile`,
    accessToken,
    {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
  const data = await readApiResponse(response, "Không thể cập nhật hồ sơ.");

  if (!isUser(data)) {
    throw new Error("Phản hồi hồ sơ không hợp lệ.");
  }
  return data;
};
