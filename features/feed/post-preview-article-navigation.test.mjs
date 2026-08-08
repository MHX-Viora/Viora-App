import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./post-preview-screen.tsx", import.meta.url), "utf8");

test("post preview lets users open an article after seeing its card", () => {
  assert.doesNotMatch(source, /router\.replace\([\s\S]*?\/article\/\[id\]/);
  assert.match(source, /loadedPost\.postType\s*===\s*2\s*&&\s*!loadedPost\.article/);
  assert.match(source, /const article\s*=\s*await getArticle\(loadedPost\.id\)/);
  assert.match(source, /loadedPost\.article\s*=\s*\{[\s\S]*?title:\s*article\.title[\s\S]*?thumbnailUrl:\s*article\.thumbnailUrl[\s\S]*?preview:\s*article\.preview[\s\S]*?readingTimeMinutes:\s*article\.readingTimeMinutes/);
  assert.match(
    source,
    /onOpenArticle=\{\(articleId\)\s*=>[\s\S]*?pathname:\s*"\/article\/\[id\]"[\s\S]*?params:\s*\{\s*id:\s*articleId\s*\}/,
  );
});
