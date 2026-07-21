import { Platform } from "react-native";

import { authenticatedFetch } from "@/services/authenticated-fetch";
import { getAccessToken } from "@/stores/session-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const REGISTER_DEVICE_TOKEN_URL = `${BASE_URL}/api/device-token/register`;

type DevicePlatform = "Android" | "iOS" | "Web" | "Unknown";
type LegacyDevicePlatform = 0 | 1 | 2 | 3;

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
  if (Platform.OS === "android") return "Android";
  if (Platform.OS === "ios") return "iOS";
  if (Platform.OS === "web") return "Web";
  return "Unknown";
};

const getLegacyPlatformValue = (): LegacyDevicePlatform => {
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
  const accessToken = await getAccessToken();
  console.info("[Push] register device token request", {
    accessTokenExists: !!accessToken,
    apiUrlConfigured: !!BASE_URL,
    deviceId: input.deviceId,
    platform: getPlatformValue(),
    requestUrl: REGISTER_DEVICE_TOKEN_URL,
    tokenLength: input.token.length,
    tokenSuffix: input.token.slice(-8),
  });

  let response = await authenticatedFetch(REGISTER_DEVICE_TOKEN_URL, {
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
  let data = parseResponseText(await response.text());
  console.info("[Push] register device token response", {
    body: data,
    status: response.status,
  });

  if (response.status === 400) {
    console.info("[Push] retry register device token with legacy platform", {
      platform: getLegacyPlatformValue(),
    });
    response = await authenticatedFetch(REGISTER_DEVICE_TOKEN_URL, {
      body: JSON.stringify({
        appVersion: input.appVersion,
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        platform: getLegacyPlatformValue(),
        token: input.token,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    data = parseResponseText(await response.text());
    console.info("[Push] register device token legacy response", {
      body: data,
      status: response.status,
    });
  }

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
  const accessToken = await getAccessToken();
  console.info("[Push] unregister device token request", {
    accessTokenExists: !!accessToken,
    apiUrlConfigured: !!BASE_URL,
    tokenLength: token.length,
    tokenSuffix: token.slice(-8),
  });

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
  console.info("[Push] unregister device token response", {
    body: data,
    status: response.status,
  });

  if (!response.ok) {
    throw new Error("Không thể hủy đăng ký thiết bị nhận thông báo.");
  }

  return mapDeviceTokenResponse(data);
};
