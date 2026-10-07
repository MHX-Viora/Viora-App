const mimeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
};

const extensionByMime: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/webm": "webm",
};

export const appendArticleMedia = async (
  formData: FormData,
  uri: string,
  index: number,
  isWeb: boolean,
): Promise<void> => {
  const candidate = uri.split(/[?#]/)[0].split("/").pop() || "";
  const extension = candidate.split(".").pop()?.toLowerCase() || "";
  const mimeFromName = mimeByExtension[extension];

  if (!isWeb) {
    const type = mimeFromName || "image/jpeg";
    const name = mimeFromName ? candidate : `article-${index + 1}.jpg`;
    formData.append("files", { uri, name, type } as unknown as Blob);
    return;
  }

  let response: Response;
  try {
    response = await fetch(uri);
  } catch {
    throw new Error("Không thể đọc tệp đã chọn. Vui lòng chọn lại.");
  }
  if (!response.ok) throw new Error("Không thể đọc tệp đã chọn. Vui lòng chọn lại.");

  const file = await response.blob();
  const type = file.type.startsWith("image/") || file.type.startsWith("video/") ? file.type : mimeFromName;
  if (!file.size || !type || !(type.startsWith("image/") || type.startsWith("video/"))) {
    throw new Error("Chỉ hỗ trợ ảnh hoặc video hợp lệ.");
  }

  const name = mimeFromName ? candidate : `article-${index + 1}.${extensionByMime[type] || "bin"}`;
  formData.append("files", file.type === type ? file : new Blob([file], { type }), name);
};
