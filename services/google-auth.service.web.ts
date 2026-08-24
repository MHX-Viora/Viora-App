import {
  FirebaseError,
  getApp,
  getApps,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import {
  getAuth,
  getIdToken,
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";

const popupCancellationCodes = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

let webAuth: Auth | null = null;

const requiredConfigValue = (value: string | undefined, name: string) => {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Thiếu cấu hình ${name} cho đăng nhập Google trên Web.`);
  }
  return normalized;
};

const getFirebaseWebOptions = (): FirebaseOptions => ({
  apiKey: requiredConfigValue(
    process.env.EXPO_PUBLIC_FIREBASE_WEB_API_KEY,
    "EXPO_PUBLIC_FIREBASE_WEB_API_KEY",
  ),
  appId: requiredConfigValue(
    process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID,
    "EXPO_PUBLIC_FIREBASE_WEB_APP_ID",
  ),
  authDomain: requiredConfigValue(
    process.env.EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN,
    "EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN",
  ),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_WEB_MESSAGING_SENDER_ID?.trim(),
  projectId: requiredConfigValue(
    process.env.EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID,
    "EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID",
  ),
});

const getFirebaseWebAuth = () => {
  if (webAuth) return webAuth;

  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseWebOptions());
  webAuth = getAuth(app);
  return webAuth;
};

const getGoogleAuthErrorMessage = (error: unknown) => {
  if (!(error instanceof FirebaseError)) {
    return "Không thể xác thực tài khoản Google. Vui lòng thử lại.";
  }

  switch (error.code) {
    case "auth/popup-blocked":
      return "Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép cửa sổ bật lên rồi thử lại.";
    case "auth/unauthorized-domain":
      return "Tên miền Web hiện chưa được cho phép trong Firebase Authentication.";
    case "auth/operation-not-allowed":
      return "Đăng nhập Google chưa được bật trong Firebase Authentication.";
    case "auth/network-request-failed":
      return "Không thể kết nối Google. Vui lòng kiểm tra mạng và thử lại.";
    default:
      return "Không thể xác thực tài khoản Google. Vui lòng thử lại.";
  }
};

export const getGoogleFirebaseToken = async (): Promise<string | null> => {
  const auth = getFirebaseWebAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    await setPersistence(auth, inMemoryPersistence);
    const credential = await signInWithPopup(auth, provider);
    return getIdToken(credential.user, true);
  } catch (error) {
    if (error instanceof FirebaseError && popupCancellationCodes.has(error.code)) {
      return null;
    }
    throw new Error(getGoogleAuthErrorMessage(error));
  }
};

export const clearGoogleAuthSession = async (): Promise<void> => {
  if (!webAuth) return;
  await signOut(webAuth).catch(() => undefined);
};
