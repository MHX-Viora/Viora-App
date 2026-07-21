export type UserSettingsTheme = "system" | "light" | "dark";

export type UserSettingsLanguage = "vi" | "en";

export type UserSettings = {
  allowComment: boolean;
  allowMention: boolean;
  allowMessageEveryone: boolean;
  isPrivate: boolean;
  language: UserSettingsLanguage;
  theme: UserSettingsTheme;
};

export type UpdateUserSettingsInput = Partial<UserSettings>;
