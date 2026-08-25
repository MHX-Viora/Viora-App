import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./webrtc-call.service.web.ts", import.meta.url), "utf8");

test("web voice peer uses browser media and closes local tracks", () => {
  assert.match(source, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(source, /new RTCPeerConnection/);
  assert.match(source, /localStream\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
});
