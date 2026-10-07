export function hasCameraPreviewFrame(video: HTMLVideoElement | null) {
  const stream = video?.srcObject as MediaStream | null | undefined;
  const track = stream?.getVideoTracks()[0];
  return Boolean(
    video &&
    track?.readyState === "live" &&
    video.readyState >= 2 &&
    video.videoWidth > 0 &&
    video.videoHeight > 0 &&
    !video.paused &&
    !video.ended,
  );
}
