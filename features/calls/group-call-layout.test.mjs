import assert from "node:assert/strict";
import test from "node:test";

import { getGroupCallColumnCount } from "./group-call-layout.ts";

test("group call keeps a stable native video grid while participants change", () => {
  assert.equal(getGroupCallColumnCount(1), 2);
  assert.equal(getGroupCallColumnCount(2), 2);
  assert.equal(getGroupCallColumnCount(25), 2);
});
