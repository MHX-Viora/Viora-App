import assert from "node:assert/strict";
import test from "node:test";

import { normalizePostLink } from "./post-link.ts";

test("normalizes a post link without a scheme to HTTPS", () => {
  assert.equal(
    normalizePostLink(" example.com/article "),
    "https://example.com/article",
  );
});

test("preserves valid HTTP and HTTPS post links", () => {
  assert.equal(
    normalizePostLink("https://viora.app/posts/1"),
    "https://viora.app/posts/1",
  );
  assert.equal(
    normalizePostLink("http://localhost:3000/post"),
    "http://localhost:3000/post",
  );
});

test("rejects empty and unsafe post links", () => {
  assert.equal(normalizePostLink(""), null);
  assert.equal(normalizePostLink("javascript:alert(1)"), null);
  assert.equal(normalizePostLink("file:///etc/passwd"), null);
});
