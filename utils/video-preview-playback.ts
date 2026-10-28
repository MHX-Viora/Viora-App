export async function playVideoPreview(video: Pick<HTMLVideoElement, 'muted' | 'play'>): Promise<void> {
  try {
    await video.play();
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'NotAllowedError' || video.muted) throw error;
    video.muted = true;
    await video.play();
  }
}
