package com.ankt.app.calls

import android.content.Intent
import android.os.Bundle

internal data class IncomingCallPayload(
  val type: String,
  val callId: String,
  val conversationId: String,
  val callType: String,
  val callerId: String,
  val callerName: String,
  val callerAvatarUrl: String,
) {
  val isGroupCall: Boolean get() = type == "GroupCall"
  val isVideoCall: Boolean get() = callType == "1"

  fun putInto(intent: Intent): Intent = intent.apply {
    putExtra(EXTRA_TYPE, type)
    putExtra(EXTRA_CALL_ID, callId)
    putExtra(EXTRA_CONVERSATION_ID, conversationId)
    putExtra(EXTRA_CALL_TYPE, callType)
    putExtra(EXTRA_CALLER_ID, callerId)
    putExtra(EXTRA_CALLER_NAME, callerName)
    putExtra(EXTRA_CALLER_AVATAR, callerAvatarUrl)
  }

  fun asFcmData(action: String): Map<String, String> = mapOf(
    "type" to type,
    "callId" to callId,
    "conversationId" to conversationId,
    "callType" to callType,
    "callerId" to callerId,
    "callerDisplayName" to callerName,
    "callerAvatarUrl" to callerAvatarUrl,
    "incomingCallAction" to action,
    "deliverySource" to "android-native-call",
  )

  companion object {
    const val EXTRA_TYPE = "incoming_call_type"
    const val EXTRA_CALL_ID = "incoming_call_id"
    const val EXTRA_CONVERSATION_ID = "incoming_call_conversation_id"
    const val EXTRA_CALL_TYPE = "incoming_call_media_type"
    const val EXTRA_CALLER_ID = "incoming_call_caller_id"
    const val EXTRA_CALLER_NAME = "incoming_call_caller_name"
    const val EXTRA_CALLER_AVATAR = "incoming_call_caller_avatar"

    fun fromFcm(bundle: Bundle): IncomingCallPayload? = create(
      type = bundle.getString("type") ?: "IncomingCall",
      callId = bundle.getString("callId"),
      conversationId = bundle.getString("conversationId"),
      callType = bundle.getString("callType") ?: "0",
      callerId = bundle.getString("callerId"),
      callerName = bundle.getString("callerDisplayName"),
      callerAvatarUrl = bundle.getString("callerAvatarUrl") ?: "",
    )

    fun fromIntent(intent: Intent): IncomingCallPayload? = create(
      type = intent.getStringExtra(EXTRA_TYPE) ?: "IncomingCall",
      callId = intent.getStringExtra(EXTRA_CALL_ID),
      conversationId = intent.getStringExtra(EXTRA_CONVERSATION_ID),
      callType = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "0",
      callerId = intent.getStringExtra(EXTRA_CALLER_ID),
      callerName = intent.getStringExtra(EXTRA_CALLER_NAME),
      callerAvatarUrl = intent.getStringExtra(EXTRA_CALLER_AVATAR) ?: "",
    )

    private fun create(
      type: String,
      callId: String?,
      conversationId: String?,
      callType: String,
      callerId: String?,
      callerName: String?,
      callerAvatarUrl: String,
    ): IncomingCallPayload? {
      val safeCallId = callId?.trim().orEmpty()
      val safeConversationId = conversationId?.trim().orEmpty()
      val safeCallerId = callerId?.trim().orEmpty()
      if (safeCallId.isEmpty() || safeConversationId.isEmpty() || safeCallerId.isEmpty()) return null
      return IncomingCallPayload(
        type, safeCallId, safeConversationId, callType, safeCallerId,
        callerName?.ifBlank { null } ?: "Người dùng ANKT", callerAvatarUrl,
      )
    }
  }
}
