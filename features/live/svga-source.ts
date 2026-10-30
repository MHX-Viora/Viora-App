const API = process.env.EXPO_PUBLIC_API_URL ?? '';
export function svgaSource(url: string) {
  const resolved = new URL(url, API);
  if (resolved.protocol !== 'https:' && !(resolved.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(resolved.hostname))) throw new Error('Invalid animation URL');
  if (resolved.username || resolved.password) throw new Error('Invalid animation URL');
  return resolved.href;
}
export const svgaPlayerScript = () => svgaSource('/gift-effects/svga.min.js');
export function svgaHtml(url: string, fillWidth = false) {
  const source = JSON.stringify(svgaSource(url)).replace(/</g, '\\u003c');
  const script = svgaPlayerScript().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#animation{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}#animation{position:relative}#art{position:absolute;bottom:0;display:block}</style></head><body><div id="animation"><div id="art"></div></div><script src="${script}"></script><script>
var done=function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('done')};
try{
  var stage=document.getElementById('animation'),art=document.getElementById('art'),movie;
  var player=new SVGA.Player('#art');player.loops=1;player.setContentMode('AspectFit');player.onFinished(done);
  var resize=function(){if(!movie)return;var scale=${fillWidth ? 'true' : 'false'}?stage.clientWidth/movie.width:Math.min(stage.clientWidth/movie.width,stage.clientHeight/movie.height);var w=movie.width*scale,h=movie.height*scale;art.style.width=w+'px';art.style.height=h+'px';art.style.left=(stage.clientWidth-w)/2+'px';player.setContentMode('AspectFit')};
  window.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);
  new SVGA.Parser('#art').load(${source},function(item){var s=item.videoSize;if(!s||!Number.isFinite(s.width)||!Number.isFinite(s.height)||s.width<=0||s.height<=0){done();return}movie=s;resize();player.setVideoItem(item);player.startAnimation()},done);
}catch(e){done()}
</script></body></html>`;
}
