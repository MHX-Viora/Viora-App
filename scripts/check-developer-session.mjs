const origin = new URL(process.argv[2] || 'https://mxh.ankt.vn');
const response = await fetch(new URL('/developers/api/account/auth/me', origin), {
  headers: { Accept: 'application/json', 'X-ANKT-Developer': '1' },
  credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
});
if (response.status !== 401 || !response.headers.get('Content-Type')?.includes('application/json')) {
  throw new Error(`Developer API must return JSON 401 for a guest, received ${response.status}. Check the BFF runtime and nginx API location.`);
}
const body = await response.json();
if (typeof body?.error?.code !== 'string') throw new Error('Invalid guest session response.');
console.log('Developer guest session API verified.');
