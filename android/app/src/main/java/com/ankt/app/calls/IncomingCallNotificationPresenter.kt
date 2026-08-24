package com.ankt.app.calls

import android.app.ActivityOptions
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import com.ankt.app.MainActivity
import com.ankt.app.R

internal object IncomingCallNotificationPresenter {
  const val CHANNEL_ID = "incoming-calls-v6-native"
  const val ACTION_CLOSE = "com.ankt.app.calls.CLOSE_INCOMING_CALL"
  const val ACTION_ACCEPT = "com.ankt.app.calls.ACCEPT_INCOMING_CALL"
  const val ACTION_REJECT = "com.ankt.app.calls.REJECT_INCOMING_CALL"
  private const val TIMEOUT_MS = 30_000L

  fun presentIncomingCall(context: Context, payload: IncomingCallPayload) {
    val manager = context.getSystemService(NotificationManager::class.java)
    ensureChannel(context, manager)
    val caller = Person.Builder()
      .setName(payload.callerName)
      .setImportant(true)
      .setIcon(IconCompat.createWithResource(context, R.mipmap.ic_launcher))
      .build()
    val openIntent = pendingActivity(context, payload)
    val rejectIntent = pendingAction(context, payload, ACTION_REJECT, 1)
    val acceptIntent = pendingAnswerActivity(context, payload)
    val canUseFullScreenIntent =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE || manager.canUseFullScreenIntent()
    val description = if (payload.isVideoCall) "Cuộc gọi video đến" else "Cuộc gọi thoại đến"
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.notification_icon)
      .setColor(Color.rgb(36, 221, 228))
      .setContentTitle(payload.callerName)
      .setContentText(description)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setTimeoutAfter(TIMEOUT_MS)
      .setContentIntent(openIntent)
      .setFullScreenIntent(openIntent, canUseFullScreenIntent)
      .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, rejectIntent, acceptIntent))
      .build()
    manager.notify(notificationId(payload.callId), notification)
  }

  fun cancel(context: Context, callId: String) {
    if (callId.isBlank()) return
    context.getSystemService(NotificationManager::class.java).cancel(notificationId(callId))
    context.sendBroadcast(Intent(ACTION_CLOSE).setPackage(context.packageName).putExtra("callId", callId))
  }

  private fun ensureChannel(context: Context, manager: NotificationManager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || manager.getNotificationChannel(CHANNEL_ID) != null) return
    val sound = Uri.parse("android.resource://${context.packageName}/${R.raw.nhac_chuong}")
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Cuộc gọi đến", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Thông báo cuộc gọi thoại và video ANKT"
        enableLights(true)
        lightColor = Color.rgb(36, 221, 228)
        enableVibration(true)
        vibrationPattern = longArrayOf(500, 250, 500, 250, 900, 250)
        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
        setSound(sound, attributes)
      },
    )
  }

  private fun pendingActivity(context: Context, payload: IncomingCallPayload): PendingIntent {
    val intent = payload.putInto(Intent(context, IncomingCallActivity::class.java)).apply {
      action = "${context.packageName}.incoming.${payload.callId}"
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    return PendingIntent.getActivity(context, notificationId(payload.callId), intent, pendingFlags())
  }

  private fun pendingAnswerActivity(context: Context, payload: IncomingCallPayload): PendingIntent {
    val route = if (payload.isGroupCall) "group-call" else "call"
    val uri = Uri.Builder()
      .scheme("viora").authority(route).appendPath(payload.callId)
      .appendQueryParameter("mode", "receiver")
      .appendQueryParameter("callType", payload.callType)
      .appendQueryParameter("conversationId", payload.conversationId)
      .appendQueryParameter("displayName", payload.callerName)
      .appendQueryParameter("avatarUrl", payload.callerAvatarUrl)
      .build()
    val intent = Intent(Intent.ACTION_VIEW, uri, context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val requestCode = notificationId(payload.callId) + 2
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return PendingIntent.getActivity(context, requestCode, intent, pendingFlags())
    }
    @Suppress("DEPRECATION")
    val creatorStartMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.BAKLAVA) {
      ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOW_ALWAYS
    } else ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
    val options = ActivityOptions.makeBasic()
      .setPendingIntentCreatorBackgroundActivityStartMode(creatorStartMode)
      .toBundle()
    return PendingIntent.getActivity(context, requestCode, intent, pendingFlags(), options)
  }

  private fun pendingAction(
    context: Context,
    payload: IncomingCallPayload,
    action: String,
    offset: Int,
  ): PendingIntent {
    val intent = payload.putInto(Intent(context, IncomingCallActionReceiver::class.java)).apply {
      this.action = action
      data = Uri.parse("viora://incoming-call/${payload.callId}/$offset")
    }
    return PendingIntent.getBroadcast(context, notificationId(payload.callId) + offset, intent, pendingFlags())
  }

  private fun pendingFlags() = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  private fun notificationId(callId: String) = 0x24000000 xor callId.hashCode()
}
