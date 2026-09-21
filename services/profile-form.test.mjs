import assert from "node:assert/strict";
import test from "node:test";

import { buildProfileFormData } from "./profile-form.ts";

test("web profile form sends fields and optional images as files", async () => {
  const data = await buildProfileFormData({
    displayName: "KaKa", gender: 0,
    avatarUrl: "data:image/png;base64,YQ==",
  }, true);
  assert.equal(data.get("DisplayName"), "KaKa");
  assert.equal(data.get("Gender"), "0");
  assert.equal(data.get("Cover"), null);
  assert.ok(data.get("Avatar") instanceof Blob);
});

test("native profile form sends URI descriptors only for selected images", async () => {
  const data = await buildProfileFormData({ displayName: "KaKa", gender: 0 }, false);
  assert.equal(data.get("DisplayName"), "KaKa");
  assert.equal(data.get("Gender"), "0");
  assert.equal(data.get("Avatar"), null);
  assert.equal(data.get("Cover"), null);
});
