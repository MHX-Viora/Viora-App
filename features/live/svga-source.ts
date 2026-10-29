const API = process.env.EXPO_PUBLIC_API_URL ?? '';
export function svgaSource(url: string) {
  const resolved = new URL(url, API);
  if (resolved.protocol !== 'https:' && !(resolved.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(resolved.hostname))) throw new Error('Invalid animation URL');
  if (resolved.username || resolved.password) throw new Error('Invalid animation URL');
  return resolved.href;
}
export const svgaPlayerScript = () => svgaSource('/gift-effects/svga.min.js');
export function svgaHtml(url: string) {
  const source = JSON.stringify(svgaSource(url)).replace(/</g, '\\u003c');
  const script = svgaPlayerScript().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#animation{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}</style></head><body><div id="animation"></div><script src="${script}"></script><script>var done=function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('done')};try{var player=new SVGA.Player('#animation');player.loops=1;player.setContentMode('AspectFit');player.onFinished(done);new SVGA.Parser('#animation').load(${source},function(item){player.setVideoItem(item);player.startAnimation()},done)}catch(e){done()}</script></body></html>`;
}
