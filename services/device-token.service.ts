import { Platform } from "react-native";

import { authenticatedFetch } from "@/services/authenticated-fetch";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

type DevicePlatform = 0 | 1 | 2 | 3;

type DeviceTokenResponse = {
  success: boolean;
  isActive: boolean;
};

type DeviceTokenRegistrationErrorOptions = {
  body: unknown;
  status: number;
};

export class DeviceTokenRegistrationError extends Error {
  body: unknown;
  status: number;

  constructor({ body, status }: DeviceTokenRegistrationErrorOptions) {
    super(`Không thể đăng ký thiết bị nhận thông báo. HTTP ${status}`);
    this.name = "DeviceTokenRegistrationError";
    this.body = body;
    this.status = status;
  }
}

type RegisterDeviceTokenInput = {
  token: string;
  deviceId: string;
  deviceName: string;
  appVersion: string;
};

const getPlatformValue = (): DevicePlatform => {
  if (Platform.OS === "android") return 0;
  if (Platform.OS === "ios") return 1;
  if (Platform.OS === "web") return 2;
  return 3;
};

const parseResponseText = (text: string): unknown => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const mapDeviceTokenResponse = (value: unknown): DeviceTokenResponse => ({
  isActive: isRecord(value) && value.isActive === true,
  success: isRecord(value) && value.success === true,
});

export const registerDeviceToken = async (
  input: RegisterDeviceTokenInput,
): Promise<DeviceTokenResponse> => {
  const response = await authenticatedFetch(`${BASE_URL}/api/device-token/register`, {
    body: JSON.stringify({
      appVersion: input.appVersion,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      platform: getPlatformValue(),
      token: input.token,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new DeviceTokenRegistrationError({
      body: data,
      status: response.status,
    });
  }

  return mapDeviceTokenResponse(data);
};

export const unregisterDeviceToken = async (
  token: string,
): Promise<DeviceTokenResponse> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/device-token/unregister`,
    {
      body: JSON.stringify({ token }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error("Không thể hủy đăng ký thiết bị nhận thông báo.");
  }

  return mapDeviceTokenResponse(data);
};
