import {createAnktMiniApp} from '../../../../packages/miniapp-sdk/src/index';
export async function startMiniApp(apiOrigin: string, hostOrigin: string, clientId: string) {
  const ANKT = createAnktMiniApp({apiOrigin, hostOrigin, clientId});
  await ANKT.init();
  const session = await ANKT.auth.getSession();
  const user = await ANKT.auth.getUserInfo();
  return {ANKT, session, user};
}
