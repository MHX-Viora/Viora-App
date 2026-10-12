import { fold, searchDocs } from './content.mjs';
export function initializeDocs(root) {
  if (!root) return () => {};
  const abort = new AbortController();
  const on = (element, event, handler) => element?.addEventListener(event, handler, { signal: abort.signal });
  const announce = text => { root.querySelector('.copy-status').textContent = text; };
  const updateProfile = () => {
    const anchor = root.querySelector('[data-auth-link]');
    try {
      const hint = JSON.parse(localStorage.getItem('ankt.public-profile-hint') || 'null');
      anchor.replaceChildren();
      if (typeof hint?.displayName === 'string' && hint.displayName) {
        const avatar = document.createElement('span'); avatar.className = 'profile-avatar'; avatar.textContent = hint.displayName.slice(0, 1).toUpperCase(); avatar.setAttribute('aria-hidden', 'true');
        anchor.append(avatar); anchor.title = hint.displayName; anchor.setAttribute('aria-label', `Console của ${hint.displayName}`); anchor.href = '/developers/console';
        root.querySelector('[data-console-link]').textContent = 'Console'; root.querySelector('[data-console-link]').href = '/developers/console';
      } else { anchor.textContent = 'Đăng nhập'; anchor.removeAttribute('aria-label'); anchor.removeAttribute('title'); anchor.href = '/login?returnUrl=%2Fdevelopers%2Fconsole'; root.querySelector('[data-console-link]').textContent = 'Bắt đầu phát triển'; root.querySelector('[data-console-link]').href = '/developers/register'; }
    } catch { anchor.textContent = 'Đăng nhập'; }
  };
  updateProfile();
  on(window, 'storage', updateProfile);
  try {
    const theme = localStorage.getItem('ankt-docs-theme');
    const appTheme = localStorage.getItem('theme_mode');
    if (['dark', 'light'].includes(theme)) root.dataset.theme = theme;
    else if (['modern', 'premium-ocean', 'classic'].includes(appTheme)) root.dataset.theme = appTheme === 'classic' ? 'light' : 'dark';
  } catch { /* Storage is optional. */ }
  on(root.querySelector('[data-theme]'), 'click', () => {
    root.dataset.theme = (root.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')) === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('ankt-docs-theme', root.dataset.theme); } catch { /* Storage is optional. */ }
  });
  const menu = root.querySelector('[data-menu]');
  const sidebar = root.querySelector('#dev-sidebar');
  const closeMenu = () => { sidebar.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); };
  on(menu, 'click', () => { const open = sidebar.classList.toggle('is-open'); menu.setAttribute('aria-expanded', String(open)); });
  on(root, 'keydown', event => { if (event.key === 'Escape') { closeMenu(); menu.focus(); } });
  on(sidebar, 'click', event => { if (event.target.closest('a')) closeMenu(); });
  on(root.querySelector('.search'), 'submit', event => event.preventDefault());
  const input = root.querySelector('#dev-search');
  const results = root.querySelector('#dev-results');
  const highlight = (element, value, query) => {
    const needles = fold(query).split(/\s+/).filter(Boolean);
    const normalized = fold(value);
    let start = 0;
    for (let i = 0; i < value.length; i++) {
      const needle = needles.find(token => normalized.startsWith(token, i));
      if (!needle) continue;
      element.append(document.createTextNode(value.slice(start, i)));
      const mark = document.createElement('mark'); mark.textContent = value.slice(i, i + needle.length); element.append(mark);
      i += needle.length - 1; start = i + 1;
    }
    element.append(document.createTextNode(value.slice(start)));
  };
  on(input, 'input', () => {
    const query = input.value.trim(); results.replaceChildren(); results.hidden = !query;
    if (!query) return;
    const found = searchDocs(query);
    const heading = document.createElement('p'); heading.textContent = found.length ? `${found.length} hướng dẫn phù hợp` : 'Không tìm thấy. Thử từ khóa khác.'; results.append(heading);
    for (const page of found.slice(0, 14)) {
      const anchor = document.createElement('a'); anchor.href = page.path; highlight(anchor, page.title, query);
      const tokens = fold(query).split(/\s+/).filter(Boolean);
      const snippet = [page.description, ...page.sections.flatMap(section => [...section.paragraphs, ...section.items])].find(text => tokens.some(token => fold(text).includes(token))) || page.description;
      const summary = document.createElement('small'); highlight(summary, snippet, query); anchor.append(summary); results.append(anchor);
    }
  });
  for (const button of root.querySelectorAll('[data-copy]')) on(button, 'click', async () => {
    try { await navigator.clipboard.writeText(button.parentElement.querySelector('code').textContent); announce('Đã sao chép cấu hình.'); }
    catch { announce('Không thể sao chép. Hãy chọn nội dung trong khối mã và sao chép thủ công.'); }
  });
  return () => abort.abort();
}
