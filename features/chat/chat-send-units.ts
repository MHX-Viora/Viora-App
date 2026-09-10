export type ChatSendUnit<TAttachment> = {
  attachments: TAttachment[];
  content: string;
};

export const buildChatSendUnits = <TAttachment>(
  content: string,
  attachments: TAttachment[],
): ChatSendUnit<TAttachment>[] => {
  const units: ChatSendUnit<TAttachment>[] = content
    ? [{ attachments: [], content }]
    : [];

  return [
    ...units,
    ...attachments.map((attachment) => ({
      attachments: [attachment],
      content: "",
    })),
  ];
};
