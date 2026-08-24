import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const webSource = readFileSync(
  new URL("./google-auth.service.web.ts", import.meta.url),
  "utf8",
);
const nativeSource = readFileSync(
  new URL("./google-auth.service.ts", import.meta.url),
  "utf8",
);
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

const nativeSdkImports =
  /@react-native-firebase|@react-native-google-signin|react-native/;

test("Web Google auth uses Firebase JS without importing native SDKs", () => {
  assert.match(webSource, /from "firebase\/app"/);
  assert.match(webSource, /from "firebase\/auth"/);
  assert.doesNotMatch(webSource, nativeSdkImports);
  assert.match(webSource, /setPersistence\(auth, inMemoryPersistence\)/);
  assert.match(webSource, /signInWithPopup\(auth, provider\)/);
  assert.match(webSource, /getIdToken\(credential\.user, true\)/);
});

test("native Google auth remains isolated from the Web implementation", () => {
  assert.match(nativeSource, /@react-native-google-signin\/google-signin/);
  assert.match(nativeSource, /@react-native-firebase\/auth/);
  assert.doesNotMatch(nativeSource, /from "firebase\/auth"/);
  assert.doesNotMatch(nativeSource, /signInWithPopup/);
});

test("Web Google auth validates Firebase config and treats popup cancellation as a no-op", () => {
  for (const name of [
    "EXPO_PUBLIC_FIREBASE_WEB_API_KEY",
    "EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_WEB_APP_ID",
  ]) {
    assert.match(webSource, new RegExp(name));
    assert.match(envExample, new RegExp(`^${name}=`, "m"));
  }

  assert.match(webSource, /auth\/popup-closed-by-user/);
  assert.match(webSource, /auth\/cancelled-popup-request/);
  assert.match(webSource, /return null/);
});

test("Web logout only signs out an already initialized Firebase session", () => {
  assert.match(webSource, /if \(!webAuth\) return/);
  assert.match(webSource, /await signOut\(webAuth\)\.catch/);
});
