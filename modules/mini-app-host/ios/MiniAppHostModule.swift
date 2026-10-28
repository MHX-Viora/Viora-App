import ExpoModulesCore
import WebKit

public final class MiniAppHostModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MiniAppHost")
    View(MiniAppHostView.self) {
      Events("onHostMessage", "onHostError")
      Prop("configuration") { (view: MiniAppHostView, value: [String: String]) in view.configure(value) }
      AsyncFunction("send") { (view: MiniAppHostView, value: String) in view.send(value) }
      AsyncFunction("stop") { (view: MiniAppHostView) in view.shutdown() }
    }
  }
}

final class MiniAppHostView: ExpoView, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
  let onHostMessage = EventDispatcher()
  let onHostError = EventDispatcher()
  private var browser: WKWebView?
  private var origin: String?
  private var ended = false
  private var bridgeMode = false
  private var count = 0
  private var windowStart = Date()

  private func allowed(_ url: URL?) -> Bool {
    guard let url, let base = origin.flatMap(URL.init(string:)), url.scheme == "https",
      url.host == base.host, url.port == base.port, url.user == nil, url.password == nil,
      (bridgeMode || url.query == nil), url.fragment == nil, (bridgeMode || !url.absoluteString.contains("%")) else { return false }
    return bridgeMode || url.path == "/mini-app-host" || url.path.range(of:
      "^/mini-app-host/run/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
      options: .regularExpression) != nil
  }

  func configure(_ value: [String: String]) {
    guard browser == nil, !ended else { return }
    origin = value["origin"]
    bridgeMode = value["mode"] == "auth-bridge"
    // The public geolocation-denial delegate is available from iOS 27. Never
    // fall back to JS shims or the application's existing location permission.
    guard #available(iOS 27.0, *), let origin, let base = URL(string: origin),
      base.scheme == "https", base.host != nil, !base.host!.hasSuffix("."),
      base.user == nil, base.password == nil, base.path.isEmpty,
      base.query == nil, base.fragment == nil, let input = value["url"],
      let url = URL(string: input), allowed(url) else { fail(); return }
    let config = WKWebViewConfiguration()
    config.websiteDataStore = .nonPersistent()
    config.preferences.javaScriptCanOpenWindowsAutomatically = false
    config.allowsInlineMediaPlayback = false
    config.mediaTypesRequiringUserActionForPlayback = .all
    config.userContentController.add(self, name: "anktProductionHost")
    config.userContentController.addUserScript(WKUserScript(source:
      "window.ANKTProductionHost={postMessage:function(value){window.webkit.messageHandlers.anktProductionHost.postMessage(value)}};",
      injectionTime: .atDocumentStart, forMainFrameOnly: true))
    let view = WKWebView(frame: bounds, configuration: config)
    view.navigationDelegate = self
    view.uiDelegate = self
    view.allowsBackForwardNavigationGestures = false
    view.allowsLinkPreview = false
    if #available(iOS 16.4, *) { view.isInspectable = false }
    browser = view
    addSubview(view)
    view.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData))
  }

  override func layoutSubviews() { super.layoutSubviews(); browser?.frame = bounds }

  func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
    guard !ended, message.name == "anktProductionHost", message.frameInfo.isMainFrame,
      let web = browser, message.webView === web, allowed(web.url), allowed(message.frameInfo.request.url),
      let expected = origin.flatMap(URL.init(string:)), message.frameInfo.securityOrigin.protocol == "https",
      message.frameInfo.securityOrigin.host == expected.host,
      (expected.port.map { message.frameInfo.securityOrigin.port == $0 } ??
        [0, 443].contains(message.frameInfo.securityOrigin.port)),
      let data = message.body as? String, data.utf8.count <= 16384 else { return }
    if Date().timeIntervalSince(windowStart) >= 60 { windowStart = Date(); count = 0 }
    count += 1
    guard count <= 120 else { fail(); return }
    onHostMessage(["url": web.url!.absoluteString, "isMainFrame": true, "data": data])
  }

  func send(_ value: String) {
    guard !ended, let web = browser, allowed(web.url), value.utf8.count <= 16384,
      let origin, let quoted = quote(value), let quotedOrigin = quote(origin) else { return }
    web.evaluateJavaScript("if(location.origin===\(quotedOrigin)&&window===window.top){window.ANKTProductionHost?.onmessage?.({data:\(quoted)})}", completionHandler: nil)
  }
  private func quote(_ value: String) -> String? {
    guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]) else { return nil }
    return String(data: data, encoding: .utf8)
  }
  func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    guard !ended, let target = action.targetFrame else { decisionHandler(.cancel); return }
    let permit = target.isMainFrame ? allowed(action.request.url) : action.request.url?.scheme == "https"
    decisionHandler(permit ? .allow : .cancel)
    if target.isMainFrame && !permit { fail() }
  }
  func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
    let status = (response.response as? HTTPURLResponse)?.statusCode ?? 500
    let permit = response.canShowMIMEType && (!response.isForMainFrame || (allowed(response.response.url) && status < 400))
    decisionHandler(permit ? .allow : .cancel)
    if !permit && response.isForMainFrame { fail() }
  }
  func webView(_ webView: WKWebView, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    // System trust evaluation only; never trust fixture/self-signed TLS here.
    completionHandler(.performDefaultHandling, nil)
  }
  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { fail() }
  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { fail() }
  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { fail() }
  func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { nil }
  func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) { decisionHandler(.deny) }
  func webView(_ webView: WKWebView, requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, decisionHandler: @escaping (WKPermissionDecision) -> Void) { decisionHandler(.deny) }
  @available(iOS 18.4, *)
  func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) { completionHandler(nil) }
  @available(iOS 27.0, *)
  @objc(webView:requestGeolocationPermissionForOrigin:initiatedByFrame:decisionHandler:)
  func denyGeolocation(_ webView: WKWebView, origin: WKSecurityOrigin, frame: WKFrameInfo, decisionHandler: @escaping (WKPermissionDecision) -> Void) { decisionHandler(.deny) }

  private func fail() { if !ended { onHostError(["code": "HOST_UNAVAILABLE"]); shutdown() } }
  func shutdown() {
    guard !ended else { return }; ended = true
    browser?.stopLoading()
    browser?.configuration.userContentController.removeScriptMessageHandler(forName: "anktProductionHost")
    browser?.configuration.userContentController.removeAllUserScripts()
    browser?.navigationDelegate = nil; browser?.uiDelegate = nil
    browser?.removeFromSuperview(); browser = nil
  }
  override func removeFromSuperview() { shutdown(); super.removeFromSuperview() }
}
