import {createMiniAppSdk} from '../../dist/index.js';

const status = document.querySelector<HTMLElement>('#status')!;
const user = document.querySelector<HTMLElement>('#user')!;
const sdk = createMiniAppSdk(await (await fetch('/config.json', {cache: 'no-store'})).json());
function render() { status.textContent = sdk.auth.getStatus(); if (sdk.auth.getStatus() === 'unauthenticated') user.textContent = ''; }
async function run(action: () => Promise<unknown> | void) {
  try { await action(); render(); } catch { render(); status.textContent += ' — request failed safely'; }
}
for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('button'))) {
  button.addEventListener('click', () => void run(async () => {
    switch (button.id) {
      case 'login': await sdk.auth.login(); break;
      case 'consent': await sdk.auth.login({prompt: 'consent'}); break;
      case 'user-info': user.textContent = JSON.stringify(await sdk.auth.getUser()); break;
      case 'logout': sdk.auth.logout(); user.textContent = ''; break;
      case 'reload': location.reload(); break;
    }
  }));
}
await run(async () => {
  await sdk.initialize();
  if (location.pathname === '/callback') {
    const callback = new URL(location.href);
    history.replaceState(null, '', '/');
    await sdk.auth.handleRedirect(callback);
    user.textContent = JSON.stringify(await sdk.auth.getUser());
  }
});
