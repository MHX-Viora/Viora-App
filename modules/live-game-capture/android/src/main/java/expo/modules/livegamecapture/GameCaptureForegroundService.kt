package expo.modules.livegamecapture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

class GameCaptureForegroundService : Service() {
  override fun onCreate() {
    super.onCreate()
    val channel = "live_game_capture"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(channel, "Live màn hình", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, channel) else Notification.Builder(this)
    builder.setSmallIcon(android.R.drawable.presence_video_online)
      .setContentTitle("Đang live màn hình")
      .setContentText("Camera và mic đang được dùng. Mở ANKT để dừng chia sẻ.")
      .setOngoing(true)
    packageManager.getLaunchIntentForPackage(packageName)?.let { intent ->
      builder.setContentIntent(PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      startForeground(7312, builder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
    } else startForeground(7312, builder.build())
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_NOT_STICKY
  override fun onBind(intent: Intent?): IBinder? = null
}
