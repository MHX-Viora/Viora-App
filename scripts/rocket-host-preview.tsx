import { useRef } from "react";
import { LiveHostRoom } from "../features/live/live-host-room";
import { initialHostSettings } from "../features/live/live-host-model";
import type { LiveGiftQueueManager } from "../features/live/live-gift-queue-manager";
import type { PremiumGiftEffectManager } from "../features/live/premium-gift-effect-manager";
import type { HostAgoraPreviewHandle } from "../features/live/host-agora-preview";
import type { LiveHeartBurstHandle } from "../features/live/live-heart-burst";

/** Host presentation fixture with injected callbacks and no camera or network calls. */
export function RocketHostPreview({banners,onControl}:{banners:LiveGiftQueueManager;premium:PremiumGiftEffectManager;onControl:()=>void}) {
  const agoraRef=useRef<HostAgoraPreviewHandle>(null),heartRef=useRef<LiveHeartBurstHandle>(null);
  const noop=()=>{},resolved=async()=>{};
  return <LiveHostRoom mode="live" settings={{...initialHostSettings,title:"Rocket visual verification",allowGifts:true}} comments={[{id:"preview-comment",userId:"linh",name:"Linh",text:"Chúc mừng bạn!",time:"00:01"}]} pinnedComment={null} hostUserId="preview-host"
    onPinComment={resolved} giftQueue={banners} topGifters={[]} elapsed={90} countdown={0} viewerCount={1248} reactionCount={128} heartBurstRef={heartRef}
    onReportComment={resolved} onMuteUser={resolved} onDeleteComment={resolved} onSendComment={resolved}
    cameraGranted={false} cameraReady={false} cameraError={false} cameraSession={0} agoraAppId="" agoraRef={agoraRef} onTokenWillExpire={noop} microphoneGranted={false} cameraOn microphoneOn facing="front" connected
    onRequestPermissions={noop} onCameraToggle={onControl} onMicrophoneToggle={onControl} onFlipCamera={onControl} onCameraReady={noop} onCameraError={noop} onBack={noop} onStart={noop} onCancelCountdown={noop} onEndRequest={onControl} />;
}
