import assert from 'node:assert/strict';
import test from 'node:test';
import { compile } from './tests/compile-fixture.mjs';

test('late-join snapshot, room-scoped updates and reconnect retain validated presentation', async () => {
  const p={version:1,width:1280,height:720,cameraOn:true,cameraX:.9,cameraY:.1};
  const handlers={},calls=[],snapshots=[],updates=[];let reconnected;
  const connection={on:(name,fn)=>handlers[name]=fn,onreconnected:fn=>{reconnected=fn;},onclose(){},start:async()=>{},stop:async()=>{},invoke:async(...args)=>{calls.push(args);if(args[0]==='JoinLive')return{viewerCount:2,presentation:p};}};
  class Builder{withUrl(){return this;}withAutomaticReconnect(){return this;}configureLogging(){return this;}build(){return connection;}}
  const {connectLiveRoom}=compile('services/live-realtime.service.ts',{
    '@microsoft/signalr':{HubConnectionBuilder:Builder,LogLevel:{None:0}},
    '@/services/authenticated-fetch':{getRealtimeAccessToken:async()=> 'fixture'},
  });
  const noop=()=>{};
  const room=await connectLiveRoom('live',{onSnapshot:value=>snapshots.push(value),onPresentation:value=>updates.push(value),onComment:noop,onCommentDeleted:noop,onPinnedComment:noop,onViewerCount:noop,onReaction:noop,onGift:noop,onEnded:noop});
  assert.deepEqual(snapshots[0].presentation,p);
  handlers.LivePresentation({liveId:'other',presentation:p});assert.equal(updates.length,0);
  handlers.LivePresentation({liveId:'live',presentation:{...p,cameraY:.9}});assert.equal(updates[0].cameraY,.9);
  handlers.LivePresentation({liveId:'live',presentation:{...p,cameraY:Infinity}});assert.equal(updates[1],null);
  await room.setPresentation(p);assert.deepEqual(calls.at(-1),['SetLivePresentation','live',p]);
  reconnected();await Promise.resolve();await Promise.resolve();assert.equal(snapshots.length,2);
  await room.setPresentation(null);assert.deepEqual(calls.at(-1),['SetLivePresentation','live',null]);
  await room.close();
});
