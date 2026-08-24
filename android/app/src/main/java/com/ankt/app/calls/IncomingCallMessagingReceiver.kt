package com.ankt.app.calls

import android.content.Context
import android.content.Intent
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.common.SharedUtils
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingReceiver

class IncomingCallMessagingReceiver : ReactNativeFirebaseMessagingReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val extras = intent.extras
    if (extras != null) {
      val data = RemoteMessage(extras).data
      val type = data["type"].orEmpty()
      val callId = data["callId"].orEmpty()
      if (type in LIFECYCLE_TYPES) {
        IncomingCallNotificationPresenter.cancel(context, callId)
      } else if (type == "IncomingCall" || type == "GroupCall") {
        val payload = IncomingCallPayload.fromFcm(extras)
        if (payload != null && !SharedUtils.isAppInForeground(context)) {
          IncomingCallNotificationPresenter.presentIncomingCall(context, payload)
        }
      }
    }
    super.onReceive(context, intent)
  }

  private companion object {
    val LIFECYCLE_TYPES = setOf(
      "CallRejected", "CallCancelled", "CallEnded", "CallMissed", "CallTimeout", "GroupCallEnded",
    )
  }
}
