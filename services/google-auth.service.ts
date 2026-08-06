import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  getAuth,
  getIdToken,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from "@react-native-firebase/auth";
import { Platform } from "react-native";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

if (Platform.OS !== "web" && webClientId) {
  GoogleSignin.configure({ webClientId });
}

export const getGoogleFirebaseToken = async (): Promise<string | null> => {
  if (Platform.OS === "web") {
    throw new Error("Đăng nhập Google hiện chỉ hỗ trợ ứng dụng Android/iOS.");
  }
  if (!webClientId) {
    throw new Error("Thiếu cấu hình EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
  }

  try {
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const result = await GoogleSignin.signIn();
    if (result.type === "cancelled") return null;
    if (!result.data.idToken) {
      throw new Error("Google không trả về ID token.");
    }

    const { accessToken } = await GoogleSignin.getTokens();
    if (!accessToken) {
      throw new Error("Google không trả về access token.");
    }

    const credential = GoogleAuthProvider.credential(
      result.data.idToken,
      accessToken,
    );
    const firebaseSession = await signInWithCredential(getAuth(), credential);
    return getIdToken(firebaseSession.user, true);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }
    throw error;
  }
};

export const clearGoogleAuthSession = async (): Promise<void> => {
  await firebaseSignOut(getAuth()).catch(() => undefined);
  if (Platform.OS !== "web") {
    await GoogleSignin.signOut().catch(() => undefined);
  }
};
