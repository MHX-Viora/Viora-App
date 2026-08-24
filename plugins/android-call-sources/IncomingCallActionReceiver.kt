package com.ankt.app.calls

import android.app.ActivityOptions
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import com.ankt.app.MainActivity
import com.facebook.react.HeadlessJsTaskService
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingHeadlessService
import java.util.UUID

class IncomingCallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val payload = IncomingCallPayload.fromIntent(intent) ?: return
    when (intent.action) {
      IncomingCallNotificationPresenter.ACTION_ACCEPT -> {
        openExistingCallScreen(context, payload)
        IncomingCallNotificationPresenter.cancel(context, payload.callId)
      }
      IncomingCallNotificationPresenter.ACTION_REJECT -> {
        IncomingCallNotificationPresenter.cancel(context, payload.callId)
        forwardToReactNative(context, payload, "reject")
      }
    }
  }

  private fun forwardToReactNative(context: Context, payload: IncomingCallPayload, action: String) {
    val message = RemoteMessage.Builder("${context.packageName}.incoming-call-action")
      .setMessageId(UUID.randomUUID().toString())
      .also { builder -> payload.asFcmData(action).forEach(builder::addData) }
      .build()
    val serviceIntent = Intent(context, ReactNativeFirebaseMessagingHeadlessService::class.java)
      .putExtra("message", message)
    try {
      if (context.startService(serviceIntent) != null) HeadlessJsTaskService.acquireWakeLockNow(context)
    } catch (_: IllegalStateException) {
      // The notification is already dismissed; backend lifecycle will reconcile if the OEM blocks headless JS.
    }
  }

  @Suppress("DEPRECATION")
  private fun openExistingCallScreen(context: Context, payload: IncomingCallPayload) {
    val route = if (payload.isGroupCall) "group-call" else "call"
    val uri = Uri.Builder()
      .scheme("viora")
      .authority(route)
      .appendPath(payload.callId)
      .appendQueryParameter("mode", "receiver")
      .appendQueryParameter("callType", payload.callType)
      .appendQueryParameter("conversationId", payload.conversationId)
      .appendQueryParameter("displayName", payload.callerName)
      .appendQueryParameter("avatarUrl", payload.callerAvatarUrl)
      .build()
    val activityIntent = Intent(Intent.ACTION_VIEW, uri, context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      context,
      payload.callId.hashCode(),
      activityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val options = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      val backgroundStartMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.BAKLAVA) {
        ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOW_ALWAYS
      } else {
        ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
      }
      ActivityOptions.makeBasic()
        .setPendingIntentBackgroundActivityStartMode(backgroundStartMode)
        .toBundle()
    } else null
    pendingIntent.send(context, 0, null, null, null, null, options)
  }
}
