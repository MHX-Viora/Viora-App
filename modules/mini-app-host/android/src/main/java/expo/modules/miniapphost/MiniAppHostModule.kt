package expo.modules.miniapphost

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.webkit.*
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher
import org.json.JSONObject
import java.net.URI

class MiniAppHostModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MiniAppHost")
    View(MiniAppHostView::class) {
      Events("onHostMessage", "onHostError")
      Prop("configuration") { view: MiniAppHostView, value: Map<String, String> -> view.configure(value) }
      AsyncFunction("send") { view: MiniAppHostView, value: String -> view.send(value) }
      AsyncFunction("stop") { view: MiniAppHostView -> view.shutdown() }
      OnViewDestroys { view: MiniAppHostView -> view.shutdown() }
    }
  }
}

class MiniAppHostView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  val onHostMessage by EventDispatcher()
  val onHostError by EventDispatcher()
  override val shouldUseAndroidLayout = true
  private var browser: WebView? = null
  private var origin: String? = null
  private var committed = false
  private var ended = false
  private var bridgeMode = false
  private var messages = 0
  private var windowStart = 0L

  private fun allowed(url: String?): Boolean = try {
    val u = URI(url ?: "")
    val base = URI(origin ?: "")
    u.scheme == "https" && u.rawUserInfo == null && (bridgeMode || u.rawQuery == null) && u.rawFragment == null &&
      u.host == base.host && u.port == base.port && u.toASCIIString() == url &&
      (bridgeMode || u.rawPath == "/mini-app-host" || Regex("/mini-app-host/run/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}").matches(u.rawPath ?: ""))
  } catch (_: Exception) { false }

  fun configure(value: Map<String, String>) {
    if (browser != null || ended) return
    origin = value["origin"]
    bridgeMode = value["mode"] == "auth-bridge"
    val initial = value["url"]
    val validOrigin = try {
      val u = URI(origin ?: "")
      u.scheme == "https" && !u.host.isNullOrEmpty() && u.rawUserInfo == null && u.rawQuery == null && u.rawFragment == null && u.rawPath.isNullOrEmpty() && !u.host.endsWith('.')
    } catch (_: Exception) { false }
    if (!validOrigin || !allowed(initial) || !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) { fail(); return }
    val view = WebView(context)
    browser = view
    view.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
      allowFileAccess = false
      allowContentAccess = false
      @Suppress("DEPRECATION")
      setAllowFileAccessFromFileURLs(false)
      @Suppress("DEPRECATION")
      setAllowUniversalAccessFromFileURLs(false)
      setGeolocationEnabled(false)
      javaScriptCanOpenWindowsAutomatically = false
      setSupportMultipleWindows(true)
      mediaPlaybackRequiresUserGesture = true
      cacheMode = WebSettings.LOAD_NO_CACHE
    }
    // No global CookieManager changes: Social/calls keep their existing policy.
    CookieManager.getInstance().setAcceptThirdPartyCookies(view, false)
    view.setDownloadListener { _, _, _, _, _ -> /* Explicitly unsupported. */ }
    view.webChromeClient = object : WebChromeClient() {
      override fun onPermissionRequest(request: PermissionRequest) { request.deny() }
      override fun onGeolocationPermissionsShowPrompt(origin: String?, callback: GeolocationPermissions.Callback) { callback.invoke(origin, false, false) }
      override fun onShowFileChooser(webView: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean { callback?.onReceiveValue(null); return true }
      override fun onCreateWindow(view: WebView?, dialog: Boolean, gesture: Boolean, result: android.os.Message?): Boolean = false
      override fun onConsoleMessage(message: ConsoleMessage?): Boolean = true
    }
    view.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        if (request.isForMainFrame) { if (!allowed(request.url.toString())) { fail(); return true }; return false }
        return request.url.scheme != "https"
      }
      override fun onPageStarted(view: WebView, url: String?, icon: Bitmap?) { committed = false; if (!allowed(url)) fail() }
      override fun onPageCommitVisible(view: WebView, url: String?) { committed = allowed(url) && allowed(view.url); if (!committed) fail() }
      override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError?) { handler.cancel(); fail() }
      override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) { if (request.isForMainFrame) fail() }
      override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) { if (request.isForMainFrame && response.statusCode >= 400) fail() }
      override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean { fail(); return true }
    }
    WebViewCompat.addWebMessageListener(view, "ANKTProductionHost", setOf(origin!!)) { web, message, source, main, _ ->
      // Both frame identity and origin come from WebView, never JSON fields.
      val now = android.os.SystemClock.elapsedRealtime()
      if (now - windowStart > 60000) { windowStart = now; messages = 0 }
      val data = message.data
      if (!ended && main && source.toString() == origin && allowed(web.url) && data != null && data.length <= 16384) {
        if (++messages > 120) { fail() }
        else {
          // A script may run before onPageCommitVisible. Platform source metadata
          // still authenticates it; the URL check also applies before first load.
          committed = true
          onHostMessage(mapOf("url" to web.url.orEmpty(), "isMainFrame" to true, "data" to data))
        }
      }
    }
    addView(view, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    view.loadUrl(initial!!)
  }

  fun send(value: String) {
    val web = browser ?: return
    if (ended || !committed || !allowed(web.url) || value.length > 16384) return
    // Evaluate only in the current top document. JSON is quoted as data.
    web.evaluateJavascript("if(location.origin===${JSONObject.quote(origin)}&&window===window.top){window.ANKTProductionHost?.onmessage?.({data:${JSONObject.quote(value)}})}", null)
  }

  private fun fail() { if (!ended) { onHostError(mapOf("code" to "HOST_UNAVAILABLE")); shutdown() } }
  fun shutdown() {
    if (ended) return
    ended = true; committed = false
    browser?.let { view ->
      view.stopLoading()
      WebViewCompat.removeWebMessageListener(view, "ANKTProductionHost")
      removeView(view); view.destroy()
    }
    browser = null
  }
}
