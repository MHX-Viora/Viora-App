package com.ankt.app.calls

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.net.URL

class IncomingCallActivity : Activity() {
  private var call: IncomingCallPayload? = null
  private val timeoutHandler = Handler(Looper.getMainLooper())
  private val timeout = Runnable {
    call?.let { IncomingCallNotificationPresenter.cancel(this, it.callId) }
    finish()
  }
  private val closeReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      val activeCallId = call?.callId ?: return
      if (intent?.getStringExtra("callId") == activeCallId) finish()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setShowWhenLocked(true)
    setTurnScreenOn(true)
    registerCloseReceiver()
    showCall(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    showCall(intent)
  }

  override fun onDestroy() {
    timeoutHandler.removeCallbacks(timeout)
    runCatching { unregisterReceiver(closeReceiver) }
    super.onDestroy()
  }

  private fun showCall(intent: Intent?) {
    val sourceIntent = intent ?: run {
      finish()
      return
    }
    val nextCall = IncomingCallPayload.fromIntent(sourceIntent) ?: run {
      finish()
      return
    }
    call = nextCall
    render(nextCall)
    timeoutHandler.removeCallbacks(timeout)
    timeoutHandler.postDelayed(timeout, 30_000L)
  }

  private fun registerCloseReceiver() {
    val filter = IntentFilter(IncomingCallNotificationPresenter.ACTION_CLOSE)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(closeReceiver, filter, RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      registerReceiver(closeReceiver, filter)
    }
  }

  private fun render(call: IncomingCallPayload) {
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = BACKGROUND.toInt()

    val root = FrameLayout(this)
    root.setBackgroundColor(BACKGROUND.toInt())
    createBackdropGlow(root, CYAN_GLOW.toInt(), dp(360), Gravity.TOP or Gravity.END, -190, -100)
    createBackdropGlow(root, PURPLE_GLOW.toInt(), dp(380), Gravity.BOTTOM or Gravity.START, -170, -140)
    val content = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(28), dp(32), dp(28), dp(16))
      setOnApplyWindowInsetsListener { view, insets ->
        val bottomInset = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          insets.getInsets(WindowInsets.Type.navigationBars()).bottom
        } else 0
        view.setPadding(dp(28), dp(32), dp(28), bottomInset + dp(16))
        insets
      }
    }
    root.addView(content, FrameLayout.LayoutParams(-1, -1))

    content.addView(createHeaderCard(call), params(match = true, height = dp(48)))
    content.addView(space(weight = 0.55f))
    content.addView(createAvatarHalo(call), params(dp(250), dp(250)))
    content.addView(TextView(this).apply {
      text = call.callerName
      setTextColor(TEXT.toInt())
      textSize = 28f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      maxLines = 1
    }, params(match = true, height = -2).apply { topMargin = dp(16) })
    content.addView(TextView(this).apply {
      text = when {
        call.isGroupCall -> "Đang mời bạn tham gia nhóm"
        call.isVideoCall -> "Đang gọi video cho bạn"
        else -> "Đang gọi cho bạn"
      }
      setTextColor(TEXT_MUTED.toInt())
      textSize = 15f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
    }, params(match = true, height = -2).apply { topMargin = dp(8) })
    content.addView(space(weight = 1f))
    content.addView(createActionsCard(), params(match = true, height = dp(132)))

    setContentView(root)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      window.insetsController?.let { controller ->
        controller.hide(WindowInsets.Type.statusBars())
        controller.systemBarsBehavior =
          WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      }
    }
  }

  private fun createBackdropGlow(
    root: FrameLayout,
    color: Int,
    size: Int,
    gravity: Int,
    horizontalMargin: Int,
    verticalMargin: Int,
  ) {
    root.addView(View(this).apply { background = oval(color) }, FrameLayout.LayoutParams(size, size).apply {
      this.gravity = gravity
      if (gravity and Gravity.END == Gravity.END) marginEnd = horizontalMargin else leftMargin = horizontalMargin
      if (gravity and Gravity.BOTTOM == Gravity.BOTTOM) bottomMargin = verticalMargin else topMargin = verticalMargin
    })
  }

  private fun createHeaderCard(call: IncomingCallPayload): FrameLayout = FrameLayout(this).apply {
    background = roundedRect(SURFACE_ELEVATED.toInt(), BORDER_SUBTLE.toInt(), 18)
    addView(TextView(this@IncomingCallActivity).apply {
      text = when {
        call.isGroupCall && call.isVideoCall -> "Cuộc gọi video nhóm đến"
        call.isGroupCall -> "Cuộc gọi nhóm đến"
        call.isVideoCall -> "Cuộc gọi video đến"
        else -> "Cuộc gọi đến"
      }
      setTextColor(TEXT_MUTED.toInt())
      textSize = 15f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
    }, FrameLayout.LayoutParams(-1, -1))
  }

  private fun createActionsCard(): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER
    setPadding(dp(16), dp(12), dp(16), dp(12))
    background = roundedRect(SURFACE_ELEVATED.toInt(), BORDER_SUBTLE.toInt(), 18)
    addView(
      actionControl("Từ chối", android.R.drawable.ic_menu_close_clear_cancel, REJECT.toInt()) {
        dispatch(IncomingCallNotificationPresenter.ACTION_REJECT)
      },
      LinearLayout.LayoutParams(0, dp(104), 1f),
    )
    addView(
      actionControl("Trả lời", android.R.drawable.sym_action_call, ACCENT.toInt()) {
        dispatch(IncomingCallNotificationPresenter.ACTION_ACCEPT)
      },
      LinearLayout.LayoutParams(0, dp(104), 1f),
    )
  }

  private fun createAvatarHalo(call: IncomingCallPayload): FrameLayout {
    val halo = FrameLayout(this)
    halo.addView(createHaloRing(dp(245), OUTER_RING.toInt()), centered(dp(245)))
    halo.addView(createHaloRing(dp(195), MIDDLE_RING.toInt()), centered(dp(195)))
    halo.addView(createHaloRing(dp(145), GLOW.toInt()), centered(dp(145)))
    val avatarFrame = FrameLayout(this).apply {
      background = oval(0xFFFFFFFF.toInt())
      clipToOutline = true
      contentDescription = call.callerName
    }
    avatarFrame.addView(TextView(this).apply {
      text = callerInitial(call.callerName)
      setTextColor(ACCENT.toInt())
      textSize = 44f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }, FrameLayout.LayoutParams(-1, -1))
    if (call.callerAvatarUrl.isNotBlank()) {
      val avatar = ImageView(this).apply {
        scaleType = ImageView.ScaleType.CENTER_CROP
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
      }
      avatarFrame.addView(avatar, FrameLayout.LayoutParams(-1, -1))
      loadCallerAvatar(call.callerAvatarUrl, avatar)
    }
    halo.addView(avatarFrame, centered(dp(128)))
    return halo
  }

  private fun createHaloRing(size: Int, color: Int) = View(this).apply {
    background = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(Color.TRANSPARENT)
      setStroke(dp(2), color)
    }
  }

  private fun loadCallerAvatar(url: String, avatar: ImageView) {
    if (url.isBlank()) return
    Thread {
      val bitmap = runCatching { URL(url).openStream().use(BitmapFactory::decodeStream) }.getOrNull()
      if (bitmap != null) runOnUiThread {
        avatar.clearColorFilter()
        avatar.setImageBitmap(bitmap)
      }
    }.start()
  }

  private fun callerInitial(callerName: String): String =
    callerName.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"

  private fun actionControl(
    label: String,
    icon: Int,
    color: Int,
    onClick: () -> Unit,
  ): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.CENTER
    addView(ImageButton(this@IncomingCallActivity).apply {
      setImageResource(icon)
      setColorFilter(Color.WHITE)
      background = oval(color)
      elevation = dp(8).toFloat()
      contentDescription = label
      setOnClickListener { onClick() }
    }, LinearLayout.LayoutParams(dp(68), dp(68)))
    addView(TextView(this@IncomingCallActivity).apply {
      text = label
      setTextColor(TEXT.toInt())
      textSize = 14f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
    }, LinearLayout.LayoutParams(-1, dp(32)))
  }

  private fun dispatch(action: String) {
    val activeCall = call ?: return
    timeoutHandler.removeCallbacks(timeout)
    sendBroadcast(activeCall.putInto(Intent(this, IncomingCallActionReceiver::class.java)).apply {
      this.action = action
      setPackage(packageName)
    })
    IncomingCallNotificationPresenter.cancel(this, activeCall.callId)
    finish()
  }

  private fun space(weight: Float) = View(this).apply {
    layoutParams = LinearLayout.LayoutParams(1, 0, weight)
  }

  private fun params(width: Int, height: Int) = LinearLayout.LayoutParams(width, height)
  private fun params(match: Boolean, height: Int) =
    LinearLayout.LayoutParams(if (match) -1 else -2, height)
  private fun centered(size: Int) = FrameLayout.LayoutParams(size, size, Gravity.CENTER)
  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
  private fun oval(color: Int) = GradientDrawable().apply {
    shape = GradientDrawable.OVAL
    setColor(color)
  }
  private fun roundedRect(color: Int, strokeColor: Int, radius: Int) = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    cornerRadius = dp(radius).toFloat()
    setColor(color)
    setStroke(dp(1), strokeColor)
  }

  private companion object {
    const val BACKGROUND = 0xFF06101C
    const val ACCENT = 0xFF24DDE4
    const val REJECT = 0xFFFF5470
    const val GLOW = 0xFF9850E8
    const val TEXT = 0xFFF4F9FF
    const val TEXT_MUTED = 0xFF9EADC0
    const val SURFACE_ELEVATED = 0xAD16263F
    const val BORDER_SUBTLE = 0x3D8BA6C6
    const val CYAN_GLOW = 0x1F24DDE4
    const val PURPLE_GLOW = 0x1F9850E8
    const val OUTER_RING = 0x8524DDE4
    const val MIDDLE_RING = 0xDB24DDE4
  }
}
