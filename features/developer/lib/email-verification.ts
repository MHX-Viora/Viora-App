type VerificationRequest = (path: string, method: 'POST', body: { token: string }) => Promise<unknown>;

export function verificationToken(fragment: string): string | null {
  const token = new URLSearchParams(fragment.replace(/^#/, '')).get('token');
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

// Per-mounted-page memory only. Sharing the promise avoids consuming a one-use
// token twice when React replays effects in development StrictMode.
export function createEmailVerification(token: string, request: VerificationRequest) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Liên kết xác minh không hợp lệ.');
  let pending: Promise<unknown> | undefined;
  return {
    verify: () => pending ??= Promise.resolve().then(() => request('auth/verify-email', 'POST', { token })),
    retry: () => { pending = undefined; },
  };
}
