import {useEffect,useRef,useState} from 'react';
import {AppState,Platform,View} from 'react-native';
import {WebView} from 'react-native-webview';
import * as Crypto from 'expo-crypto';
import type {HostProps} from './host';
import {getSession,subscribeSessionInvalidation} from '../../../stores/session-store';
import {createAuthBridgeSourceGuard} from '../lib/auth-bridge-source';
import {createAuthBridgeHost,type AuthLaunch} from '../lib/auth-bridge-host';
import {createNativeAuthTransport} from '../lib/native-auth-transport';

export default function AuthHost({appId,attempt,onStatus}:HostProps){
  const view=useRef<WebView>(null),status=useRef(onStatus);status.current=onStatus;
  const [config,setConfig]=useState<{url:string;origin:string;bootstrap:string}|null>(null);
  const receive=useRef<(event:{url:string;data:string})=>void>(()=>{});
  const navigate=useRef<(url:string)=>boolean>(()=>false),stop=useRef<()=>void>(()=>{});
  const start=useRef<(url:string)=>void>(()=>{});
  useEffect(()=>{
    let ended=false,host:ReturnType<typeof createAuthBridgeHost>|undefined,transport:ReturnType<typeof createNativeAuthTransport>|undefined;
    const source={},abort=new AbortController();
    const api=(process.env.EXPO_PUBLIC_API_URL??'').replace(/\/$/,'');
    setConfig(null);
    const finish=()=>{if(ended)return;ended=true;abort.abort();transport?.dispose();host?.dispose();view.current?.stopLoading();setConfig(null);};
    const sourceGuard=createAuthBridgeSourceGuard(()=>{status.current('host.closed');finish();});
    const unsubscribe=subscribeSessionInvalidation(finish);
    const sourceTimer=setInterval(()=>{void getSession().then(session=>{if(!ended)sourceGuard.check(session);}).catch(finish);},1000);
    stop.current=finish;
    async function call<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T>{
      const session=await getSession();
      if(path!=='revoke'&&(!sourceGuard.check(session)||ended))throw Object.assign(Error('SESSION_EXPIRED'),{code:'SESSION_EXPIRED'});
      if(body!==undefined&&!session?.accessToken)throw Object.assign(Error('SESSION_EXPIRED'),{code:'SESSION_EXPIRED'});
      const response=await fetch(api+'/api/miniapp/auth/'+path,{method:body===undefined?'GET':'POST',credentials:'omit',redirect:'error',cache:'no-store',
        signal:path==='revoke'?AbortSignal.timeout(5000):signal??abort.signal,
        headers:{'Content-Type':'application/json','X-Ankt-Platform':Platform.OS==='ios'?'iOS':'Android',...(session?.accessToken?{Authorization:'Bearer '+session.accessToken}:{})},
        ...(body===undefined?{}:{body:JSON.stringify(body)})});
      const data=response.status===204?null:await response.json();
      if(!response.ok){const code=data?.error?.code??'AUTH_EXCHANGE_FAILED';throw Object.assign(Error(code),{code});}return data as T;
    }
    void call<{clientId:string;launchUrl:string;origin:string}>('config?clientId='+encodeURIComponent(appId)).then(async value=>{
      const url=new URL(value.launchUrl);
      if(url.protocol!=='https:'||url.username||url.password||url.origin!==value.origin||value.clientId!==appId)throw Error('INVALID_ORIGIN');
      const bytes=await Crypto.getRandomBytesAsync(32);
      const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      let nonce='',bits=0,buffer=0;
      for(const byte of bytes){buffer=(buffer<<8)|byte;bits+=8;while(bits>=6){bits-=6;nonce+=alphabet[(buffer>>>bits)&63];}}
      if(bits)nonce+=alphabet[(buffer<<(6-bits))&63];
      if(ended)return;
      transport=createNativeAuthTransport(url.href,nonce);
      host=createAuthBridgeHost({clientId:appId,origin:value.origin,source:()=>source,
        send:data=>{if(!ended&&transport)view.current?.injectJavaScript(transport.injection(data));},
        launch:(codeChallenge,signal)=>call<AuthLaunch>('launch',{clientId:appId,codeChallenge,origin:value.origin,scope:'profile'},signal),
        revoke:sessionId=>call<void>('revoke',{sessionId}),
        close:finish,
        status:state=>{if(!ended)status.current(state==='Connected'?'bridge.connected':state==='Closed'?'host.closed':state==='Failed'?'host.error':'host.running');}});
      receive.current=event=>{const data=transport?.receive(event);if(!ended&&data)void host?.handle({origin:value.origin,source,data});};
      navigate.current=next=>{if(transport?.matches(next))return true;status.current('host.error');finish();return false;};
      let started=false;
      start.current=next=>{if(started){status.current('host.close_unconfirmed');finish();return;}started=true;navigate.current(next);};
      setConfig({url:url.href,origin:value.origin,bootstrap:transport.bootstrap});status.current('host.running');
    }).catch(()=>{if(!ended){status.current('host.error');finish();}});
    const subscription=AppState.addEventListener('change',state=>{if(state!=='active'){status.current('host.close_unconfirmed');finish();}});
    return()=>{finish();unsubscribe();clearInterval(sourceTimer);receive.current=()=>{};navigate.current=()=>false;start.current=()=>{};subscription.remove();};
  },[appId,attempt]);
  return <View style={{flex:1}}>{config&&<WebView ref={view} style={{flex:1}} source={{uri:config.url}}
    originWhitelist={[config.origin]} incognito sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false}
    javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows geolocationEnabled={false}
    allowsInlineMediaPlayback={false} mediaPlaybackRequiresUserAction mediaCapturePermissionGrantType="deny"
    allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false} mixedContentMode="never"
    injectedJavaScriptBeforeContentLoaded={config.bootstrap} injectedJavaScript={config.bootstrap}
    injectedJavaScriptBeforeContentLoadedForMainFrameOnly injectedJavaScriptForMainFrameOnly
    onMessage={event=>receive.current(event.nativeEvent)}
    onShouldStartLoadWithRequest={request=>navigate.current(request.url)}
    onLoadStart={event=>{start.current(event.nativeEvent.url);}}
    onNavigationStateChange={state=>{navigate.current(state.url);}}
    onOpenWindow={()=>{status.current('host.error');stop.current();}}
    onError={()=>{status.current('host.error');stop.current();}}
    onHttpError={()=>{status.current('host.error');stop.current();}}
    onContentProcessDidTerminate={()=>{status.current('host.error');stop.current();}}
    onRenderProcessGone={()=>{status.current('host.error');stop.current();}}/>}</View>;
}
