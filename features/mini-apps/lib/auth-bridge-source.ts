// Compare stable identity/source IDs, never access tokens (which rotate normally).
export function createAuthBridgeSourceGuard(invalidate:()=>void) {
  let source:string|undefined,ended=false;
  return {check(session:{sessionId?:string|null;user?:{id:string}|null}|null) {
    if(ended)return false;
    const key=session?JSON.stringify([session.user?.id,session.sessionId]):undefined;
    if(!key||source!==undefined&&source!==key){ended=true;invalidate();return false;}
    source=key;return true;
  }};
}
