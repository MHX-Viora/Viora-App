export type Gender = 0 | 1 | 2;

export type GenderLabel = "Nam" | "Nữ" | "Khác";

export type AuthAlertKind = "error" | "info" | "success";

export type AuthAlertOptions = {
  title: string;
  message: string;
  kind?: AuthAlertKind;
  actionLabel?: string;
  onAction?: () => void;
};

export type AuthAlertProps = {
  alert: AuthAlertOptions | null;
  onAction: () => void;
  onClose: () => void;
};

export type User = {
  id: string;
  accountId: string;
  displayName: string;
  avatarUrl: string;
  coverUrl: string;
  role: number;
  isVerified: boolean;
  verificationStatus: number;
  accountStyle: number;
};

export type Credentials = {
  identifier: string;
  password: string;
};

export type ForgotPasswordStatus = {
  userId: string;
  phoneNumber: string | null;
  hasPhoneNumber: boolean;
};

export type ForgotPasswordMessage = {
  success: boolean;
  message: string;
};

export type ProfileInput = {
  displayName: string;
  avatarUrl: string;
  coverUrl: string;
  gender: Gender;
};

export type UpdateProfileInput = {
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  gender: Gender;
};

export type RegisterResponse = { message: string };

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  sessionId?: string;
  user: User | null;
};

export type AccessTokenResponse = Omit<LoginResponse, "user">;

export type Session = Omit<LoginResponse, "refreshToken">;

export type StorageAdapter = {
  deleteItemAsync(key: string): Promise<void>;
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
};
