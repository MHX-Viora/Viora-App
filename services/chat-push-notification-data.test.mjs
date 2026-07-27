import assert from "node:assert/strict";
import test from "node:test";

import { mapChatPushNotification } from "./chat-push-notification-data.ts";

test("maps sender name, avatar and message into a messaging notification", () => {
  const mapped = mapChatPushNotification({
    body: "Xin chào",
    conversationAvatarUrl: "https://cdn.viora.app/group.jpg",
    conversationId: "conversation-1",
    conversationName: "Nhóm bạn thân",
    conversationType: "1",
    createdAt: "2026-07-27T03:30:00.000Z",
    messageId: "message-1",
    messageType: "0",
    senderAvatarUrl: "https://cdn.viora.app/avatar.jpg",
    senderId: "sender-1",
    senderName: "Minh Thư",
    type: "chat",
  });

  assert.deepEqual(mapped, {
    avatarUrl: "https://cdn.viora.app/avatar.jpg",
    body: "Xin chào",
    conversationAvatarUrl: "https://cdn.viora.app/group.jpg",
    conversationId: "conversation-1",
    conversationName: "Nhóm bạn thân",
    data: {
      conversationAvatarUrl: "https://cdn.viora.app/group.jpg",
      conversationId: "conversation-1",
      conversationName: "Nhóm bạn thân",
      conversationType: "1",
      messageId: "message-1",
      messageType: "0",
      senderAvatarUrl: "https://cdn.viora.app/avatar.jpg",
      senderId: "sender-1",
      senderName: "Minh Thư",
      type: "chat",
    },
    isGroupConversation: true,
    largeIconUrl: "https://cdn.viora.app/group.jpg",
    messageId: "message-1",
    senderId: "sender-1",
    senderName: "Minh Thư",
    title: "Nhóm bạn thân",
    timestamp: 1_785_123_000_000,
  });
});

test("uses safe fallbacks when avatar and timestamp are invalid", () => {
  const before = Date.now();
  const mapped = mapChatPushNotification({
    conversationId: "conversation-1",
    createdAt: "invalid",
    messagePreview: "",
    senderAvatarUrl: "javascript:alert(1)",
    senderName: "",
  });
  const after = Date.now();

  assert.equal(mapped.avatarUrl, undefined);
  assert.equal(mapped.body, "Bạn có tin nhắn mới");
  assert.equal(mapped.senderName, "Người dùng Viora");
  assert.ok(mapped.timestamp >= before && mapped.timestamp <= after);
});

test("uses an attachment-aware preview for an image message", () => {
  const mapped = mapChatPushNotification({
    conversationId: "conversation-1",
    messagePreview: "",
    messageType: "1",
    senderName: "Minh Thư",
  });

  assert.equal(mapped.body, "Đã gửi một ảnh");
  assert.equal(mapped.isGroupConversation, false);
  assert.equal(mapped.title, "Minh Thư");
});
