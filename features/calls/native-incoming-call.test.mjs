import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const manifest = read("../../android/app/src/main/AndroidManifest.xml");
const debugManifest = read("../../android/app/src/debug/AndroidManifest.xml");
const debugOptimizedManifest = read(
  "../../android/app/src/debugOptimized/AndroidManifest.xml",
);
const receiver = read(
  "../../android/app/src/main/java/com/ankt/app/calls/IncomingCallMessagingReceiver.kt",
);
const presenter = read(
  "../../android/app/src/main/java/com/ankt/app/calls/IncomingCallNotificationPresenter.kt",
);
const activity = read(
  "../../android/app/src/main/java/com/ankt/app/calls/IncomingCallActivity.kt",
);
const mainActivity = read(
  "../../android/app/src/main/java/com/ankt/app/MainActivity.kt",
);
const actionReceiver = read(
  "../../android/app/src/main/java/com/ankt/app/calls/IncomingCallActionReceiver.kt",
);
const payload = read(
  "../../android/app/src/main/java/com/ankt/app/calls/IncomingCallPayload.kt",
);
const backgroundMessaging = read("../../services/firebase-background-messaging.ts");
const settingsModule = read(
  "../../android/app/src/main/java/com/ankt/app/calls/IncomingCallSettingsModule.kt",
);
const settingsService = read("../../services/incoming-call-settings.service.ts");

test("only an active call route can appear over keyguard", () => {
  assert.doesNotMatch(
    manifest,
    /android:name="\.MainActivity"[^>]+android:showWhenLocked="true"/,
  );
  assert.match(
    manifest,
    /android\.permission\.SYSTEM_ALERT_WINDOW" tools:node="remove"/,
  );
  assert.match(debugManifest, /SYSTEM_ALERT_WINDOW" tools:node="remove"/);
  assert.match(debugOptimizedManifest, /SYSTEM_ALERT_WINDOW" tools:node="remove"/);
  assert.match(
    manifest,
    /android:name="\.calls\.IncomingCallActivity"[^>]+android:showWhenLocked="true"[^>]+android:turnScreenOn="true"/,
  );
  assert.match(mainActivity, /isCallIntent\(intent\)/);
  assert.match(mainActivity, /setShowWhenLocked\(showCallOverKeyguard\)/);
  assert.match(mainActivity, /setTurnScreenOn\(showCallOverKeyguard\)/);
  assert.match(mainActivity, /!keyguardManager\.isDeviceSecure/);
  assert.match(mainActivity, /requestDismissKeyguard\(this, null\)/);
  assert.match(settingsModule, /setCallScreenActive\(active: Boolean\)/);
  assert.match(settingsModule, /activity\.setShowWhenLocked\(active\)/);
  assert.match(activity, /postDelayed\(timeout, 30_000L\)/);
});

test("incoming-call activity attaches its decor view before using window insets", () => {
  const attachViewAt = activity.indexOf("setContentView(root)");
  const readInsetsAt = activity.indexOf("window.insetsController");
  assert.ok(attachViewAt >= 0, "incoming-call content view must be attached");
  assert.ok(readInsetsAt >= 0, "incoming-call system bars must be configured");
  assert.ok(
    attachViewAt < readInsetsAt,
    "setContentView must run before window.insetsController to avoid a cold-start DecorView crash",
  );
});

test("native call actions close only the ringing activity and keep the app task alive", () => {
  assert.doesNotMatch(
    activity,
    /finishAndRemoveTask\(\)/,
    "answering must not remove the MainActivity task that owns the active call screen",
  );
  assert.match(activity, /IncomingCallNotificationPresenter\.cancel[\s\S]*finish\(\)/);
  assert.match(activity, /closeReceiver[\s\S]*?finish\(\)[\s\S]*?override fun onCreate/);
});

test("lock-screen call UI exposes app-style icon actions with accessible labels", () => {
  assert.match(activity, /ImageButton/);
  assert.match(activity, /android\.R\.drawable\.sym_action_call/);
  assert.match(activity, /android\.R\.drawable\.ic_menu_close_clear_cancel/);
  assert.match(activity, /contentDescription = label/);
  assert.match(activity, /actionControl\("Từ chối"/);
  assert.match(activity, /actionControl\("Trả lời"/);
});

test("lock-screen call UI uses the same visual tokens and avatar halo as the app", () => {
  assert.match(activity, /const val BACKGROUND = 0xFF06101C/);
  assert.match(activity, /const val ACCENT = 0xFF24DDE4/);
  assert.match(activity, /const val REJECT = 0xFFFF5470/);
  assert.match(activity, /const val GLOW = 0xFF9850E8/);
  assert.match(activity, /FrameLayout/);
  assert.match(activity, /ImageView/);
  assert.match(activity, /createAvatarHalo/);
  assert.match(activity, /loadCallerAvatar/);
});

test("lock-screen call UI matches the in-app incoming-call surfaces and subtle backdrop", () => {
  assert.match(activity, /root\.setBackgroundColor\(BACKGROUND\.toInt\(\)\)/);
  assert.match(activity, /const val SURFACE_ELEVATED = 0xAD16263F/);
  assert.match(activity, /const val BORDER_SUBTLE = 0x3D8BA6C6/);
  assert.match(activity, /createBackdropGlow/);
  assert.match(activity, /createHeaderCard/);
  assert.match(activity, /createActionsCard/);
  assert.match(activity, /createHaloRing/);
  assert.match(activity, /text = callerInitial\(call\.callerName\)/);
  assert.match(activity, /callerInitial[\s\S]*trim\(\)[\s\S]*firstOrNull[\s\S]*uppercase/);
  assert.match(activity, /contentDescription = call\.callerName/);
  assert.doesNotMatch(activity, /android\.R\.drawable\.ic_menu_myplaces/);
  assert.doesNotMatch(
    activity,
    /GradientDrawable\.Orientation\.TL_BR[\s\S]*intArrayOf\(GLOW\.toInt\(\), BACKGROUND\.toInt\(\)/,
  );
});

test("lock-screen call UI keeps caller details and actions clear of system bars", () => {
  assert.match(activity, /setOnApplyWindowInsetsListener/);
  assert.match(activity, /WindowInsets\.Type\.navigationBars\(\)/);
  assert.match(activity, /bottomInset \+ dp\(16\)/);
  assert.match(activity, /text = call\.callerName[\s\S]*params\(match = true, height = -2\)/);
});

test("native receiver renders background calls before starting React Native", () => {
  assert.match(receiver, /ReactNativeFirebaseMessagingReceiver/);
  assert.match(
    receiver,
    /presentIncomingCall[\s\S]*super\.onReceive\(context, intent\)/,
  );
  assert.match(presenter, /NotificationCompat\.CallStyle\.forIncomingCall/);
  assert.match(presenter, /setFullScreenIntent/);
  assert.match(presenter, /canUseFullScreenIntent/);
});

test("native answer and reject actions are handed to the RN headless handler", () => {
  assert.match(actionReceiver, /ReactNativeFirebaseMessagingHeadlessService/);
  assert.match(payload, /"incomingCallAction" to action/);
  assert.match(backgroundMessaging, /data\.incomingCallAction === "reject"/);
  assert.match(backgroundMessaging, /data\.incomingCallAction === "accept"/);
});

test("answer action opens the call route through an Android 14+ background-safe PendingIntent", () => {
  assert.match(
    presenter,
    /val acceptIntent = pendingAnswerActivity\(context, payload\)/,
  );
  assert.match(
    presenter,
    /pendingAnswerActivity[\s\S]*Intent\.ACTION_VIEW[\s\S]*MainActivity::class\.java/,
  );
  assert.match(
    presenter,
    /setPendingIntentCreatorBackgroundActivityStartMode/,
  );
  assert.match(
    mainActivity,
    /cancelIncomingCallNotification\(intent\)[\s\S]*IncomingCallNotificationPresenter\.cancel/,
  );
  assert.doesNotMatch(
    actionReceiver,
    /context\.startActivity\(/,
    "a broadcast receiver cannot directly start the call activity while the app is backgrounded",
  );
  assert.match(actionReceiver, /PendingIntent\.getActivity/);
  assert.match(actionReceiver, /setPendingIntentBackgroundActivityStartMode/);
  assert.match(actionReceiver, /MODE_BACKGROUND_ACTIVITY_START_ALLOWED/);
  assert.match(actionReceiver, /pendingIntent\.send/);
});

test("background JS persists native calls without posting a duplicate notification", () => {
  assert.match(
    backgroundMessaging,
    /savePendingIncomingCall\(notificationData\)[\s\S]*Platform\.OS === "android"[\s\S]*return;/,
  );
});

test("Android 14+ checks full-screen access and guides the user to system settings", () => {
  assert.match(settingsModule, /canUseFullScreenIntent\(\)/);
  assert.match(settingsModule, /ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT/);
  assert.match(settingsService, /Cho phép cuộc gọi toàn màn hình/);
  assert.match(settingsService, /thông báo nổi/);
});
