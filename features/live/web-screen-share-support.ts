export function webScreenShareUnavailableReason(support = {
  secure: typeof window !== 'undefined' && window.isSecureContext,
  capture: typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function',
}): string | null {
  if (!support.secure) return 'Cần mở trang bằng HTTPS hoặc localhost để chia sẻ màn hình.';
  if (!support.capture) return 'Trình duyệt này không hỗ trợ live màn hình/game. Hãy dùng ứng dụng Android có hỗ trợ hoặc trình duyệt máy tính. Bạn vẫn có thể live bằng camera trên trình duyệt này.';
  return null;
}
