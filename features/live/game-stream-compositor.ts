import { gameStreamLayout } from './game-stream-layout';

export async function createGameStream(screenTrack: MediaStreamTrack, cameraTrack: MediaStreamTrack, cameraEnabled: () => boolean) {
  if (!HTMLCanvasElement.prototype.captureStream) throw new Error('Trình duyệt chưa hỗ trợ ghép màn hình và camera.');
  const screen = document.createElement('video'), camera = document.createElement('video');
  for (const video of [screen, camera]) { video.muted = true; video.playsInline = true; }
  screen.srcObject = new MediaStream([screenTrack]); camera.srcObject = new MediaStream([cameraTrack]);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Không tạo được khung hình live game.');
  let timer: ReturnType<typeof setInterval> | undefined;
  let output: MediaStream | undefined;
  const stop = () => { clearInterval(timer); screen.pause(); camera.pause(); screen.srcObject = null; camera.srcObject = null; output?.getTracks().forEach(track => track.stop()); };
  try {
    await Promise.all([screen.play(), camera.play()]);
    const settings = screenTrack.getSettings();
    const layout = gameStreamLayout(screen.videoWidth || settings.width || 1920, screen.videoHeight || settings.height || 1080);
    canvas.width = layout.width; canvas.height = layout.height;
    const draw = () => {
      if (screen.readyState < 2) return;
      context.fillStyle = '#091725'; context.fillRect(0, 0, canvas.width, canvas.height);
      const ratio = Math.min(canvas.width / screen.videoWidth, canvas.height / screen.videoHeight);
      const w = screen.videoWidth * ratio, h = screen.videoHeight * ratio;
      context.drawImage(screen, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      if (cameraEnabled() && camera.readyState >= 2) {
        const inset = layout.inset, ratio = Math.max(inset.width / camera.videoWidth, inset.height / camera.videoHeight);
        const sw = inset.width / ratio, sh = inset.height / ratio;
        context.save(); context.beginPath(); context.roundRect(inset.x, inset.y, inset.width, inset.height, 12); context.clip();
        context.drawImage(camera, (camera.videoWidth - sw) / 2, (camera.videoHeight - sh) / 2, sw, sh, inset.x, inset.y, inset.width, inset.height);
        context.restore(); context.strokeStyle = 'rgba(255,255,255,.9)'; context.lineWidth = 3; context.beginPath(); context.roundRect(inset.x, inset.y, inset.width, inset.height, 12); context.stroke();
      }
    };
    draw(); timer = setInterval(draw, 1000 / 30);
    output = canvas.captureStream(30);
    const track = output.getVideoTracks()[0]; if (!track) throw new Error('Không tạo được video ghép.');
    return { track, layout, stop };
  } catch (error) { stop(); throw error; }
}
