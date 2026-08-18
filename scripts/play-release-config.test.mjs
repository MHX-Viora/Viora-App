import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url)));
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url)),
);
const googleServices = JSON.parse(
  readFileSync(new URL("../google-services.json", import.meta.url)),
);
assert.equal(app.expo.version, "1.0.10");
assert.equal(app.expo.android.versionCode, 11);
assert.equal(packageJson.version, app.expo.version);

const androidClient = googleServices.client.find(
  (client) =>
    client.client_info?.android_client_info?.package_name === "com.ankt.app",
);
assert.ok(androidClient, "Missing Firebase Android client for com.ankt.app");
assert.ok(
  androidClient.oauth_client.some(
    (client) =>
      client.client_type === 1 &&
      client.android_info?.certificate_hash ===
        "d9540349db2bd39310e573afa0fea98de9f251ca",
  ),
  "Missing the Google Play App Signing SHA-1 OAuth client",
);
assert.ok(
  androidClient.oauth_client.some((client) => client.client_type === 3),
  "Missing the Web OAuth client required for Google Sign-In",
);
