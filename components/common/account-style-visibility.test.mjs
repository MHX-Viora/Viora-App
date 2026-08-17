import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const publicSurfaces = [
  new URL("../feed/post-card.tsx", import.meta.url),
  new URL("../profile/profile-overview.tsx", import.meta.url),
  new URL("../../features/article/article-reader-screen.tsx", import.meta.url),
];

for (const file of publicSurfaces) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /AccountStyleBadge/,
    `Account style badges must not render on ${file.pathname}`,
  );
}
