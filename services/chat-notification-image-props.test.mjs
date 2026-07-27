import assert from "node:assert/strict";
import test from "node:test";

import {
  getChatMessagingStyleProps,
  getChatNotificationImageProps,
} from "./chat-push-notification-data.ts";

test("omits native image properties when no valid avatar is available", () => {
  const images = getChatNotificationImageProps(
    {
      avatarUrl: undefined,
      largeIconUrl: undefined,
    },
    false,
  );

  assert.deepEqual(images.android, {});
  assert.deepEqual(images.sender, {});
  assert.equal("largeIcon" in images.android, false);
  assert.equal("icon" in images.sender, false);
});

test("omits the messaging style title for a direct conversation", () => {
  const style = getChatMessagingStyleProps({
    isGroupConversation: false,
    title: "Minh Thu",
  });

  assert.deepEqual(style, { group: false });
  assert.equal("title" in style, false);
});

test("includes the messaging style title for a group conversation", () => {
  const style = getChatMessagingStyleProps({
    isGroupConversation: true,
    title: "Nhom ban than",
  });

  assert.deepEqual(style, {
    group: true,
    title: "Nhom ban than",
  });
});
