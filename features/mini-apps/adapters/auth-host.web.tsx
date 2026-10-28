import {useEffect,useRef} from 'react';
import type {HostProps} from './host';
import {getSession,subscribeSessionInvalidation} from '../../../stores/session-store';
import {createAuthBridgeSourceGuard} from '../lib/auth-bridge-source';
import {createAuthBridgeHost,type AuthLaunch} from '../lib/auth-bridge-host';

export default function AuthHost({appId,attempt,onStatus}:HostProps){
  const frame=useRef<HTMLIFrameElement>(null),status=useRef(onStatus);status.current=onStatus;
  useEffect(()=>{const element=frame.current;if(!element)return;let host:ReturnType<typeof createAuthBridgeHost>|undefined,ended=false,connected=false;
    const abort=new AbortController();
    const invalidate=()=>{if(ended)return;ended=true;abort.abort();host?.dispose();element.src='about:blank';status.current('host.closed');};
    const sourceGuard=createAuthBridgeSourceGuard(invalidate);
    const unsubscribe=subscribeSessionInvalidation(invalidate);
    const sourceTimer=setInterval(()=>{void getSession().then(session=>{if(!ended)sourceGuard.check(session);}).catch(invalidate);},1000);
    const api=(process.env.EXPO_PUBLIC_API_URL??'').replace(/\/$/,'');
    async function call<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T>{
      const session=await getSession();if(path!=='revoke'&&(!sourceGuard.check(session)||ended))throw Error('SESSION_EXPIRED');
      if(body!==undefined&&!session?.accessToken)throw Error('SESSION_EXPIRED');
      const response=await fetch(api+'/api/miniapp/auth/'+path,{method:body===undefined?'GET':'POST',credentials:'omit',cache:'no-store',redirect:'error',
        headers:{'Content-Type':'application/json',...(session?.accessToken?{Authorization:'Bearer '+session.accessToken}:{})},
        ...(body===undefined?{}:{body:JSON.stringify(body)}),signal});
      const data=response.status===204?null:await response.json();if(!response.ok){const code=data?.error?.code??'AUTH_EXCHANGE_FAILED';throw Object.assign(Error(code),{code});}return data as T;
    }
    const receive=(event:MessageEvent)=>{void host?.handle(event);};window.addEventListener('message',receive);
    void call<{clientId:string;launchUrl:string;origin:string}>('config?clientId='+encodeURIComponent(appId),undefined,abort.signal).then(config=>{
      const url=new URL(config.launchUrl);if(url.protocol!=='https:'||url.origin!==config.origin||config.clientId!==appId||url.origin===location.origin)throw Error('INVALID_ORIGIN');
      if(ended)return;
      host=createAuthBridgeHost({clientId:appId,origin:config.origin,source:()=>element.contentWindow,
        send:data=>element.contentWindow?.postMessage(data,config.origin),
        launch:(codeChallenge,signal)=>call<AuthLaunch>('launch',{clientId:appId,codeChallenge,origin:config.origin,scope:'profile'},signal),
        revoke:sessionId=>call<void>('revoke',{sessionId}),close:()=>{host?.dispose();element.src='about:blank';status.current('host.closed');},status:value=>{if(!ended){connected=value==='Connected';status.current(value==='Connected'?'bridge.connected':value==='Failed'?'host.error':'host.running');}}});
      element.src=config.launchUrl;status.current('host.running');
    }).catch(()=>{if(!ended)status.current('host.error');});
    const deadline=setTimeout(()=>{if(!ended&&!connected)status.current('bridge.unavailable');},20000);
    return()=>{ended=true;abort.abort();unsubscribe();clearInterval(sourceTimer);clearTimeout(deadline);window.removeEventListener('message',receive);host?.dispose();element.src='about:blank';};
  },[appId,attempt]);
  return <iframe ref={frame} title="Mini App Auth Bridge" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms"
    allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'" style={{width:'100%',height:'100%',minHeight:320,border:0}}/>;
}
