import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("uses a fresh audible Android call channel", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "features", "calls", "call-waiting.ts"),
    "utf8",
  );

  assert.match(source, /INCOMING_CALL_CHANNEL_ID = "incoming-calls-v5"/);
});

test("keeps foreground ringtone starts idempotent and vibrating", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "services", "incoming-call-ringtone.service.ts"),
    "utf8",
  );

  assert.match(source, /if \(isRinging\) return/);
  assert.match(source, /Vibration\.vibrate\(\[0, \.\.\.INCOMING_CALL_VIBRATION_PATTERN\], true\)/);
  assert.match(source, /shouldPlayInBackground: true/);
});
