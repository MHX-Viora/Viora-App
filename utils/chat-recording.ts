import type { SendMessageAttachment } from "@/types/chat";

type CreateRecordedChatAttachmentInput = {
  createFile?: (blob: Blob, name: string, type: string) => File;
  durationMillis: number;
  loadBlob?: (uri: string) => Promise<Blob>;
  now?: number;
  platform: string;
  uri: string;
};

export const createRecordedChatAttachment = async ({
  createFile = (blob, name, type) => new File([blob], name, { type }),
  durationMillis,
  loadBlob = async (uri) => (await fetch(uri)).blob(),
  now = Date.now(),
  platform,
  uri,
}: CreateRecordedChatAttachmentInput): Promise<SendMessageAttachment> => {
  const isWeb = platform === "web";
  const name = `voice-${now}.${isWeb ? "webm" : "m4a"}`;
  const type = isWeb ? "audio/webm" : "audio/mp4";
  const file = isWeb
    ? createFile(await loadBlob(uri), name, type)
    : undefined;

  return {
    duration: Math.max(1, Math.round(durationMillis / 1000)),
    file,
    id: `${uri}-${now}`,
    kind: "audio",
    name,
    type,
    uri,
  };
};
