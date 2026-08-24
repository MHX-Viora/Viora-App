import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readerSource = readFileSync(
  new URL("./article-reader-screen.tsx", import.meta.url),
  "utf8",
);
const rendererSource = readFileSync(
  new URL("../../components/article/article-renderer.tsx", import.meta.url),
  "utf8",
);

test("desktop article reader uses a centered readable content width", () => {
  assert.match(readerSource, /getResponsiveContentLayout/);
  assert.match(readerSource, /layout\.articleMaxWidth/);
  assert.match(readerSource, /showsVerticalScrollIndicator=\{false\}/);
});

test("article images keep their ratio inside a narrower desktop media width", () => {
  assert.match(rendererSource, /contentFit="contain"/);
  assert.match(rendererSource, /aspectRatio/);
  assert.match(rendererSource, /layout\.articleMediaMaxWidth/);
});
