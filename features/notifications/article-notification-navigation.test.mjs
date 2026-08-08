import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const navigation = readFileSync(new URL("./notification-navigation.ts", import.meta.url), "utf8");
const mapper = readFileSync(new URL("./notification.mapper.ts", import.meta.url), "utf8");
const responseNavigation = readFileSync(new URL("./notification-response-navigation.ts", import.meta.url), "utf8");
const types = readFileSync(new URL("../../types/notification.ts", import.meta.url), "utf8");

test("article notifications open the post preview first", () => {
  assert.match(types, /NotificationReferenceType\s*=\s*0\s*\|\s*1\s*\|\s*2\s*\|\s*3\s*\|\s*4\s*\|\s*5\s*\|\s*6/);
  assert.match(navigation, /reference\.type\s*===\s*6[\s\S]*?pathname:\s*"\/post\/\[postId\]"/);
  assert.match(mapper, /value\s*<=\s*6/);
  assert.match(responseNavigation, /value\s*<=\s*6/);
});
