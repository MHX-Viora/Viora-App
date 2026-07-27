type Permission = {
  status: string;
};

type NotificationPermissionFlowOptions<TPermission extends Permission> = {
  ensureRequiredChannel: () => Promise<void>;
  getPermissions: () => Promise<TPermission>;
  onOptionalSetupError: (error: unknown) => void;
  requestPermissions: () => Promise<TPermission>;
  setupOptionalChannels: () => Promise<void>;
};

export async function requestNotificationPermission<
  TPermission extends Permission,
>({
  ensureRequiredChannel,
  getPermissions,
  onOptionalSetupError,
  requestPermissions,
  setupOptionalChannels,
}: NotificationPermissionFlowOptions<TPermission>): Promise<TPermission> {
  await ensureRequiredChannel();

  const currentPermission = await getPermissions();
  const finalPermission =
    currentPermission.status === "granted"
      ? currentPermission
      : await requestPermissions();

  if (finalPermission.status === "granted") {
    try {
      await setupOptionalChannels();
    } catch (error) {
      onOptionalSetupError(error);
    }
  }

  return finalPermission;
}
