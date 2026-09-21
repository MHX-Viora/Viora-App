import assert from "node:assert/strict";
import test from "node:test";

import { buildProfileFormData } from "./profile-form.ts";

const base = { displayName: "KaKa", gender: 0 };
const image = new Blob(["image"], { type: "image/png" });
const fetchImage = async () => new Response(image);

test("profile multipart keeps gender zero and omits unchanged images", async () => {
  const form = await buildProfileFormData(base, true, fetchImage);
  assert.equal(form.get("DisplayName"), "KaKa");
  assert.equal(form.get("Gender"), "0");
  assert.equal(form.has("Avatar"), false);
  assert.equal(form.has("Cover"), false);
});

for (const fields of [["avatarUrl"], ["coverUrl"], ["avatarUrl", "coverUrl"]]) {
  test(`web multipart uploads only selected images: ${fields.join(" + ")}`, async () => {
    const payload = { ...base };
    for (const field of fields) payload[field] = "blob:photo";
    const form = await buildProfileFormData(payload, true, fetchImage);
    assert.equal(form.has("Avatar"), fields.includes("avatarUrl"));
    assert.equal(form.has("Cover"), fields.includes("coverUrl"));
    for (const field of ["Avatar", "Cover"]) {
      if (form.has(field)) {
        assert.equal(form.get(field).type, "image/png");
        assert.match(form.get(field).name, /\.png$/);
      }
    }
  });
}

test("native multipart keeps React Native file descriptors", async () => {
  const entries = [];
  const form = { append: (...args) => entries.push(args) };
  await buildProfileFormData({ ...base, avatarUrl: "file:///avatar.jpg" }, false, fetchImage, form);
  assert.deepEqual(entries[2], ["Avatar", {
    uri: "file:///avatar.jpg",
    name: "avatar.jpg",
    type: "image/jpeg",
  }]);
  assert.equal(entries.length, 3);
});
