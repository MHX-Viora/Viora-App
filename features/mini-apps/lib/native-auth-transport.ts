// react-native-webview's onMessage URL is not a subframe identity on Android.
// A per-document secret injected only into the top frame binds messages to it.
export function createNativeAuthTransport(url: string, nonce: string, onDocumentChange?:()=>void) {
  const expected = new URL(url);
  if(expected.protocol!=='https:' || expected.username || expected.password || !/^[A-Za-z0-9_-]{43}$/.test(nonce))throw Error('INVALID_ORIGIN');
  const origin=expected.origin;
  let active=true;
  let documentId:string|undefined;
  const quote=(value:unknown)=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  // Tabs in a SPA change path/query/hash without replacing the authenticated
  // document. Trust the configured HTTPS origin; the nonce and document UUID
  // below still bind auth traffic and replies to that specific top document.
  function matches(value:unknown){
    if(!active||typeof value!=='string')return false;
    try{const next=new URL(value);return next.origin===origin&&!next.username&&!next.password;}catch{return false;}
  }
  const bootstrap=`(function(){if(window!==window.top||location.origin!==${quote(origin)})return;const key=${quote(nonce)};
    if(window.__anktAuthDocument===key)return;
    const send=window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView);
    const documentId=crypto.randomUUID();
    Object.defineProperty(window,'__anktAuthDocument',{value:key,configurable:true});
    Object.defineProperty(window,'__anktAuthInstance',{value:documentId});
    window.ReactNativeWebView.postMessage=function(data){send(JSON.stringify({nonce:key,documentId:documentId,data:data}));};
    window.ReactNativeWebView.postMessage(JSON.stringify({channel:'ankt.auth.transport',type:'document'}));
    window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({channel:'ankt.auth.transport',type:'ready'})}));
  })();true;`;
  return {bootstrap,matches,
    receive(event:{url?:unknown;data?:unknown}){
      // Android's WebMessageListener supplies sourceOrigin, whereas iOS and
      // the legacy Android bridge supply a document URL. The nonce below,
      // injected only into the configured top-frame origin, binds either shape.
      if(!active||(!matches(event.url)&&event.url!==expected.origin)||typeof event.data!=='string'||event.data.length>16384)return;
      try{const envelope=JSON.parse(event.data);
        if(envelope?.nonce!==nonce||typeof envelope.documentId!=='string'||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(envelope.documentId)||
          typeof envelope.data!=='string'||envelope.data.length>8192)return;
        const data=JSON.parse(envelope.data);
        const binding=data&&typeof data==='object'&&!Array.isArray(data)&&
          data.channel==='ankt.auth.transport'&&data.type==='document'&&Object.keys(data).length===2;
        if(!documentId){if(binding)documentId=envelope.documentId;return;}
        // A real reload creates a new JS document; SPA history notifications do not.
        if(envelope.documentId!==documentId){active=false;onDocumentChange?.();return;}
        if(!binding)return data as unknown;
      }catch{return;}
    },
    injection(message:unknown){
      if(!active||!documentId)return 'true;';
      return `if(window===window.top&&location.origin===${quote(origin)}&&window.__anktAuthDocument===${quote(nonce)}&&window.__anktAuthInstance===${quote(documentId)}){window.dispatchEvent(new MessageEvent('message',{data:${quote(JSON.stringify(message))}}));}true;`;
    },
    dispose(){active=false;},
  };
}
