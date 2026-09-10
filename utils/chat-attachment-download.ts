export type DownloadableChatAttachment = {
  id: string;
  name: string;
  type: "image" | "video" | "audio" | "file";
  url: string;
};

const DEFAULT_EXTENSIONS: Record<DownloadableChatAttachment["type"], string> = {
  audio: ".m4a",
  file: "",
  image: ".jpg",
  video: ".mp4",
};

const GENERIC_NAMES = new Set(["attachment", "file", "tệp", "tệp đính kèm"]);

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 160);

const fileNameFromUrl = (url: string) => {
  try {
    const segment = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    return sanitizeFileName(decodeURIComponent(segment));
  } catch {
    return "";
  }
};

const hasExtension = (value: string) => /\.[a-z0-9]{1,10}$/i.test(value);

export const buildChatAttachmentFileName = (
  attachment: DownloadableChatAttachment,
) => {
  const suppliedName = sanitizeFileName(attachment.name);
  const usableSuppliedName = GENERIC_NAMES.has(suppliedName.toLocaleLowerCase("vi"))
    ? ""
    : suppliedName;
  const urlName = fileNameFromUrl(attachment.url);
  const candidate = usableSuppliedName || (hasExtension(urlName) ? urlName : "");
  if (candidate) {
    return hasExtension(candidate)
      ? candidate
      : `${candidate}${DEFAULT_EXTENSIONS[attachment.type]}`;
  }

  return `${attachment.type}-${sanitizeFileName(attachment.id) || "download"}${DEFAULT_EXTENSIONS[attachment.type]}`;
};
