const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const fileNameFromUri = (uri: string, fallback: string) => {
  const name = uri.split(/[?#]/)[0].split("/").pop();
  return name && /\.(jpe?g|png|webp)$/i.test(name) ? name : fallback;
};

export const appendPostImage = async (
  formData: FormData,
  uri: string,
  index: number,
  isWeb: boolean,
) => {
  if (isWeb) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Không thể đọc ảnh đã chọn.");
    const image = await response.blob();
    const extension = imageExtensions[image.type];
    if (!extension || image.size === 0) {
      throw new Error("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP hợp lệ.");
    }
    formData.append("files", image, fileNameFromUri(uri, `post-${index + 1}.${extension}`));
    return;
  }

  const fileName = fileNameFromUri(uri, `post-${index + 1}.jpg`);
  const extension = fileName.split(".").pop()?.toLowerCase();
  const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
  formData.append("files", { uri, name: fileName, type } as unknown as Blob);
};
