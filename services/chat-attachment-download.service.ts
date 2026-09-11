import { NativeModules, Platform } from "react-native";

import {
  buildChatAttachmentFileName,
  type DownloadableChatAttachment,
} from "@/utils/chat-attachment-download";

export type ChatAttachmentDownloadResult = {
  fileName: string;
  outcome: "downloaded";
};

type ChatAttachmentDownloaderModule = {
  download: (url: string, fileName: string) => Promise<void>;
};

const { ChatAttachmentDownloader } = NativeModules as {
  ChatAttachmentDownloader?: ChatAttachmentDownloaderModule;
};

const assertDownloadableUrl = (url: string) => {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Tệp này chưa sẵn sàng để tải xuống.");
  }
};

const downloadOnWeb = async (
  attachment: DownloadableChatAttachment,
  fileName: string,
): Promise<ChatAttachmentDownloadResult> => {
  const response = await fetch(attachment.url);
  if (!response.ok) {
    throw new Error(`Không thể tải tệp (HTTP ${response.status}).`);
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  return { fileName, outcome: "downloaded" };
};

export const downloadChatAttachment = async (
  attachment: DownloadableChatAttachment,
): Promise<ChatAttachmentDownloadResult> => {
  try {
    assertDownloadableUrl(attachment.url);
    const fileName = buildChatAttachmentFileName(attachment);

    if (Platform.OS === "web") {
      return await downloadOnWeb(attachment, fileName);
    }

    if (Platform.OS === "android") {
      if (!ChatAttachmentDownloader?.download) {
        throw new Error("Thiết bị chưa hỗ trợ tải tệp trực tiếp.");
      }
      await ChatAttachmentDownloader.download(attachment.url, fileName);
      return { fileName, outcome: "downloaded" };
    }

    const { Directory, File } = await import("expo-file-system");
    const destination = await Directory.pickDirectoryAsync();
    await File.downloadFileAsync(
      attachment.url,
      new File(new Directory(destination.uri), fileName),
      { idempotent: true },
    );
    return { fileName, outcome: "downloaded" };
  } catch (error) {
    if (
      error instanceof Error &&
      /^(Không thể|Thiết bị|Tệp này|Tên tệp|Không tìm thấy|Tải tệp|Quá trình)/.test(
        error.message,
      )
    ) {
      throw error;
    }
    throw new Error("Không thể tải tệp. Vui lòng kiểm tra kết nối và thử lại.");
  }
};
