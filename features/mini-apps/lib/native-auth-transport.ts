// react-native-webview's onMessage URL is not a subframe identity on Android.
// A per-document secret injected only into the top frame binds messages to it.
export function createNativeAuthTransport(url: string, nonce: string) {
  const expected = new URL(url);
  if(expected.protocol!=='https:' || expected.username || expected.password || !/^[A-Za-z0-9_-]{43}$/.test(nonce))throw Error('INVALID_ORIGIN');
  const href=expected.href;
  let active=true;
  const quote=(value:unknown)=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  function matches(value:unknown){return active && typeof value==='string' && value===href;}
  const bootstrap=`(function(){if(window!==window.top||location.href!==${quote(href)})return;const key=${quote(nonce)};
    if(window.__anktAuthDocument===key)return;
    const send=window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView);
    Object.defineProperty(window,'__anktAuthDocument',{value:key,configurable:true});
    window.ReactNativeWebView.postMessage=function(data){send(JSON.stringify({nonce:key,data:data}));};
    window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({channel:'ankt.auth.transport',type:'ready'})}));
  })();true;`;
  return {bootstrap,matches,
    receive(event:{url?:unknown;data?:unknown}){
      if(!matches(event.url)||typeof event.data!=='string'||event.data.length>16384)return;
      try{const envelope=JSON.parse(event.data);
        if(envelope?.nonce!==nonce||typeof envelope.data!=='string'||envelope.data.length>8192)return;
        return JSON.parse(envelope.data) as unknown;
      }catch{return;}
    },
    injection(message:unknown){
      if(!active)return 'true;';
      return `if(window===window.top&&location.href===${quote(href)}&&window.__anktAuthDocument===${quote(nonce)}){window.dispatchEvent(new MessageEvent('message',{data:${quote(JSON.stringify(message))}}));}true;`;
    },
    dispose(){active=false;},
  };
}
