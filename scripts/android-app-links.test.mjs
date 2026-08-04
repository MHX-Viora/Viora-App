import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url)));
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
      entry.target?.package_name === "com.quyentrinh.viora" &&
      entry.target?.sha256_cert_fingerprints?.includes(
        "6D:B0:0C:87:DF:BB:E8:D6:FD:F0:6C:6E:E2:E2:44:AE:03:46:21:6F:99:22:E2:04:91:5A:14:98:71:DC:76:66",
      ),
  ),
  "Digital Asset Links statement does not match the Android production app",
);
