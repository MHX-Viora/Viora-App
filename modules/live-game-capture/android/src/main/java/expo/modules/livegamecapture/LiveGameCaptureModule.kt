package expo.modules.livegamecapture

import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LiveGameCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LiveGameCapture")
    Function("start") {
      val context = appContext.reactContext ?: error("Live context unavailable")
      // Called while the host screen is visible, before MediaProjection asks for consent.
      val intent = Intent(context, GameCaptureForegroundService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
      else context.startService(intent)
      Unit
    }
    Function("stop") {
      appContext.reactContext?.let { it.stopService(Intent(it, GameCaptureForegroundService::class.java)) }
    }
  }
}
