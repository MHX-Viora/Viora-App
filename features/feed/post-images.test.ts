import assert from "node:assert/strict";
import test from "node:test";
import { appendPickedImages, getPostImageTiles, postImagePreviewUrl, MAX_POST_IMAGES } from "./post-images.ts";

test("selection preserves order across batches and removal, caps at twenty", () => {
  const images = Array.from({ length: 25 }, (_, index) => `image-${index}`);
  assert.equal(MAX_POST_IMAGES, 20);
  const first = appendPickedImages([], images.slice(0, 10));
  const removed = first.filter((_, index) => index !== 4);
  const next = appendPickedImages(removed, images.slice(10));
  assert.equal(next.length, 20);
  assert.deepEqual(next, [...removed, ...images.slice(10, 21)]);
  assert.deepEqual(appendPickedImages(next, ["extra"]), next);
});

test("composer keeps all images with odd first-wide and even two-column layouts", () => {
  for (const count of [1, 2, 3, 4, 5, 6, 10, 16, 19, 20]) {
    const tiles = getPostImageTiles(count, "composer");
    assert.equal(tiles.length, count);
    assert.deepEqual(tiles.filter(tile => tile.wide).map(tile => tile.index), count % 2 ? [0] : []);
    assert.ok(tiles.every(tile => tile.overlayCount === 0));
  }
});

test("feed mounts four previews at most and counts images starting at position four", () => {
  for (const count of [0, 1, 2, 3, 4, 5, 8, 10, 16, 20]) {
    const tiles = getPostImageTiles(count, "feed");
    assert.equal(tiles.length, Math.min(count, 4));
    assert.equal(tiles.at(-1)?.overlayCount ?? 0, count > 4 ? count - 3 : 0);
    assert.deepEqual(tiles.filter(tile => tile.wide).map(tile => tile.index), count === 1 || count === 3 ? [0] : []);
  }
});

test("preview optimization leaves local/external/signed URLs intact and uses Cloudinary limits", () => {
  for (const uri of ["blob:fixture", "file:///image.jpg", "https://example.test/image.jpg", "https://res.cloudinary.com/demo/image/upload/s--signed--/v1/test.jpg"]) {
    assert.equal(postImagePreviewUrl(uri), uri);
  }
  assert.equal(postImagePreviewUrl("https://res.cloudinary.com/demo/image/upload/v1/test.jpg"),
    "https://res.cloudinary.com/demo/image/upload/c_limit,w_1000,h_1000,q_auto,f_auto/v1/test.jpg");
});
