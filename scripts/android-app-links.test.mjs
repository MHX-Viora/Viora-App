import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url)));
const googleServices = JSON.parse(
  readFileSync(new URL("../google-services.json", import.meta.url)),
);
const assetLinks = JSON.parse(
  readFileSync(
    new URL("../../viora-BE/viora-BE/wwwroot/.well-known/assetlinks.json", import.meta.url),
  ),
);
const shareLinkService = readFileSync(
  new URL(
    "../../viora-BE/Viora.Infrastructure/Sharing/ShareLinkService.cs",
    import.meta.url,
  ),
  "utf8",
);
const androidManifest = readFileSync(
  new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url),
  "utf8",
);

assert.equal(app.expo.android.package, "com.ankt.app");
assert.ok(
  googleServices.client.some(
    (client) =>
      client.client_info?.android_client_info?.package_name === "com.ankt.app",
  ),
  "google-services.json is missing the com.ankt.app Firebase client",
);

const filters = app.expo.android.intentFilters.filter(
  (filter) => filter.action === "VIEW" && filter.autoVerify,
);
for (const pathPrefix of ["/post", "/reel"]) {
  assert.ok(
    filters.some((filter) =>
      filter.data?.some(
        (data) =>
          data.scheme === "https" &&
          data.host === "api.mxh.ankt.vn" &&
          data.pathPrefix === pathPrefix,
      ),
    ),
    `Missing verified Android App Link for ${pathPrefix}`,
  );
}

for (const pathPrefix of ["/post", "/reel"]) {
  assert.match(
    androidManifest,
    new RegExp(
      `android:host="api\\.mxh\\.ankt\\.vn" android:pathPrefix="${pathPrefix}"`,
    ),
    `Generated AndroidManifest is missing ${pathPrefix} on the verified domain`,
  );
}
assert.doesNotMatch(
  androidManifest,
  /android:host="viora\.app"/,
  "Generated AndroidManifest still contains the obsolete App Links domain",
);

assert.match(
  shareLinkService,
  /ShareLinks:BaseUrl[^\n]+https:\/\/api\.mxh\.ankt\.vn/,
  "Backend share-link default must use the verified App Links domain",
);
assert.ok(
  assetLinks.some(
    (entry) =>
      entry.relation?.includes("delegate_permission/common.handle_all_urls") &&
      entry.target?.namespace === "android_app" &&
      entry.target?.package_name === "com.ankt.app" &&
      entry.target?.sha256_cert_fingerprints?.includes(
        "27:AD:E1:D8:D1:62:FF:25:1F:34:6D:A9:97:02:B9:51:F3:6A:3E:4D:02:AA:85:53:F8:5C:BC:5C:0F:82:34:8D",
      ),
  ),
  "Digital Asset Links statement does not match the Android production app",
);
assert.ok(
  assetLinks.some(
    (entry) =>
      entry.target?.package_name === "com.quyentrinh.viora" &&
      entry.target?.sha256_cert_fingerprints?.includes(
        "6D:B0:0C:87:DF:BB:E8:D6:FD:F0:6C:6E:E2:E2:44:AE:03:46:21:6F:99:22:E2:04:91:5A:14:98:71:DC:76:66",
      ),
  ),
  "Digital Asset Links must keep supporting the previous Android app",
);
