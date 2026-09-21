import assert from "node:assert/strict";
import test from "node:test";

import { insertAdvertisements } from "./advertisement-insertion.ts";

test("feed ads are inserted by centralized frequency bounds", () => {
  const content = Array.from({ length: 20 }, (_, index) => ({ id: `post-${index}` }));
  const ads = [{ id: "ad-1" }, { id: "ad-2" }];
  const result = insertAdvertisements(content, ads, { minimumGap: 6, maximumGap: 10, seed: 4 });
  const positions = result.flatMap((item, index) => item.kind === "advertisement" ? [index] : []);

  assert.deepEqual(positions, [10, 17]);
  assert.equal(result.filter((item) => item.kind === "content").length, content.length);
});

test("ads are not duplicated when fewer organic items are available", () => {
  const result = insertAdvertisements(
    [{ id: "post-1" }, { id: "post-2" }],
    [{ id: "ad-1" }],
    { minimumGap: 6, maximumGap: 10, seed: 0 },
  );

  assert.equal(result.some((item) => item.kind === "advertisement"), false);
});

test("empty ad inventory preserves the organic feed", () => {
  const content = [{ id: "post-1" }, { id: "post-2" }];
  assert.deepEqual(
    insertAdvertisements(content, [], { minimumGap: 6, maximumGap: 10, seed: 2 }),
    content.map((item) => ({ kind: "content", item })),
  );
});
