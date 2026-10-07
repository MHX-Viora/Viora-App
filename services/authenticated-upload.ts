export const sendAuthenticatedUpload = async <T extends { status: number }>(
  send: (token: string, formData: FormData) => Promise<T>,
  formData: FormData,
  getToken: () => Promise<string>,
  refreshRejectedToken: (token: string) => Promise<string>,
): Promise<T> => {
  const token = await getToken();
  const response = await send(token, formData);
  if (response.status !== 401 || !token) return response;

  const refreshedToken = await refreshRejectedToken(token);
  return send(refreshedToken, formData);
};
