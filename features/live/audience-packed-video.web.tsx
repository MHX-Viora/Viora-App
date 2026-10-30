import { useEffect, useRef } from 'react';
import type { VideoRect } from './live-presentation';

export function AudienceVideoCrop({ track, frame, crop, packed, name }: {
  track: MediaStreamTrack; frame: VideoRect; crop: VideoRect;
  packed: { width: number; height: number }; name: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = new MediaStream([track]);
    void element.play().catch(() => undefined);
    return () => { element.pause(); element.srcObject = null; };
  }, [track]);
  const scaleX = frame.width / crop.width, scaleY = frame.height / crop.height;
  return <div data-testid={`audience-${name}`} style={{ position: 'absolute', ...frame, overflow: 'hidden', borderRadius: name === 'camera' ? 12 : 0, pointerEvents: 'none' }}>
    <video ref={video} muted autoPlay playsInline style={{ position: 'absolute', maxWidth: 'none', width: packed.width * scaleX, height: packed.height * scaleY, left: -crop.left * scaleX, top: -crop.top * scaleY, objectFit: 'fill' }} />
  </div>;
}
