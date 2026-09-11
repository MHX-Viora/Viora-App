type ChatReadVisibility = {
  appState: string | null | undefined;
  documentVisibility?: string;
  isFocused: boolean;
};

export const canMarkConversationRead = ({
  appState,
  documentVisibility,
  isFocused,
}: ChatReadVisibility) =>
  isFocused && appState === "active" && documentVisibility !== "hidden";
