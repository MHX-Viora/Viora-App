type ReelVideoUpload = {
  uri: string;
  fileName: string;
  mimeType: string;
  isWeb: boolean;
};

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const appendReelVideo = async (
  formData: FormData,
  { uri, fileName, mimeType, isWeb }: ReelVideoUpload,
): Promise<void> => {
  if (!isWeb) {
    formData.append("video", { uri, name: fileName, type: mimeType } as unknown as Blob);
    return;
  }

  let response: Response;
  try {
    response = await fetch(uri);
  } catch {
    throw new Error("Không thể đọc video đã chọn. Vui lòng chọn lại video.");
  }
  if (!response.ok) {
    throw new Error("Không thể đọc video đã chọn. Vui lòng chọn lại video.");
  }

  const video = await response.blob();
  if (video.size === 0) {
    throw new Error("Video đã chọn bị rỗng. Vui lòng chọn video khác.");
  }
  if (video.size > MAX_VIDEO_BYTES) {
    throw new Error("Video tối đa 100 MB. Vui lòng chọn video nhỏ hơn.");
  }

  const uploadType = video.type.startsWith("video/") ? video.type : mimeType;
  if (!uploadType.startsWith("video/")) {
    throw new Error("Chỉ hỗ trợ upload video.");
  }

  formData.append("video", video.type === uploadType ? video : new Blob([video], { type: uploadType }), fileName);
};
