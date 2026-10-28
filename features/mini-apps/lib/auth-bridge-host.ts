export type AuthLaunch = {sessionId:string;code:string;expiresIn:number;clientId:string;origin:string;environment:string};
export function createAuthBridgeHost(options: {
  clientId:string;origin:string;source:()=>unknown;
  send:(message:unknown)=>void;launch:(challenge:string,signal:AbortSignal)=>Promise<AuthLaunch>;
  revoke:(id:string)=>Promise<void>;status:(value:string,errorCode?:string)=>void;
  close?:()=>void;
}) {
  let disposed=false,generation=0,inFlight=false;
  const abort=new AbortController(),seen=new Set<string>(),sessions=new Set<string>();
  async function handle(event:{origin:string;source:unknown;data:unknown}) {
    if(disposed||!event.source||event.source!==options.source()||event.origin!==options.origin)return;
    const data=event.data as Record<string,unknown>|null;
    if(!data||typeof data!=='object'||Array.isArray(data)||data.channel!=='ankt.auth'||data.version!==1||data.type!=='request'||
      typeof data.id!=='string'||!/^[0-9a-f-]{36}$/i.test(data.id))return;
    if(data.method==='auth.ready'||data.method==='auth.close'){
      const ready=data.params as Record<string,unknown>|null;
      if(ready&&typeof ready==='object'&&ready.clientId===options.clientId&&typeof ready.sessionId==='string'&&sessions.has(ready.sessionId)){
        if(data.method==='auth.close'){options.status('Closed');options.close?.();}else options.status('Connected');
      }
      return;
    }
    if(data.method!=='auth.login')return;
    const reply=(ok:boolean,result:unknown)=>options.send({channel:'ankt.auth',version:1,type:'response',id:data.id,ok,...(ok?{result}:{error:{code:result}})});
    const params=data.params as Record<string,unknown>|null;
    if(Object.keys(data).sort().join(',')!=='channel,id,method,params,type,version'||!params||typeof params!=='object'||Array.isArray(params)||
      Object.keys(params).sort().join(',')!=='clientId,codeChallenge'||params.clientId!==options.clientId||
      typeof params.codeChallenge!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(params.codeChallenge)){reply(false,'INVALID_CLIENT');options.status('Failed','INVALID_CLIENT');return;}
    if(inFlight||seen.has(data.id)||seen.size>=256){reply(false,'AUTH_EXCHANGE_FAILED');return;}
    seen.add(data.id);inFlight=true;const current=generation;options.status('Authenticating');
    try {
      const launch=await options.launch(params.codeChallenge,abort.signal);
      if(disposed||current!==generation){void options.revoke(launch.sessionId).catch(()=>{});return;}
      if(launch.clientId!==options.clientId||launch.origin!==options.origin)throw Error('INVALID_CLIENT');
      sessions.add(launch.sessionId);reply(true,launch);
    } catch(error) {
      if(!disposed&&current===generation){const code=(error as {code?:unknown})?.code;
        const failure=typeof code==='string'&&/^[A-Z_]{1,64}$/.test(code)?code:'AUTH_EXCHANGE_FAILED';
        reply(false,failure);options.status(code==='SESSION_EXPIRED'?'Session Expired':'Failed',failure);}
    } finally {inFlight=false;}
  }
  return {handle,dispose(){if(disposed)return;disposed=true;generation++;abort.abort();
    for(const session of sessions)void options.revoke(session).catch(()=>{});sessions.clear();}};
}
