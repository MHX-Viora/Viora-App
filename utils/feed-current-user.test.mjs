import assert from "node:assert/strict";
import test from "node:test";

import { applyCurrentUserToFeedPosts } from "./feed-current-user.ts";

test("updates only the current user's post author after profile save", () => {
  const posts = [
    { id: "own", authorId: "me", author: "KaKa", avatar: "old", isAuthorVerified: false },
    { id: "other", authorId: "them", author: "Other", avatar: "other", isAuthorVerified: false },
  ];
  const result = applyCurrentUserToFeedPosts(posts, {
    id: "me", displayName: "KaiKa", avatarUrl: "new", isVerified: true, accountStyle: 0,
  });
  assert.equal(result[0].author, "KaiKa");
  assert.equal(result[0].avatar, "new");
  assert.equal(result[0].isAuthorVerified, true);
  assert.equal(result[1], posts[1]);
});
