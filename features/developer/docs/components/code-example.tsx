import React, { useState } from 'react';
import type { CodeLanguage } from '../lib/content-schema';
import { highlightCode } from '../lib/highlight';
export function CodeExample({ code, language, caption }: { code: string; language: CodeLanguage; caption?: string }) {
  const [status, setStatus] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(code); setStatus('Đã sao chép'); }
    catch { setStatus('Không thể sao chép tự động. Chọn nội dung trong khối mã để sao chép.'); }
  }
  return <figure className="docs-code"><figcaption><span>{language}</span><span role="status" aria-live="polite">{status}</span><button type="button" aria-label={`Sao chép mã ${language}`} onClick={() => void copy()}>Sao chép</button></figcaption>
    {caption && <p className="docs-code-caption">{caption}</p>}<pre tabIndex={0} aria-label={`Mã ${language}`}><code>{highlightCode(code, language).map((token, i) => token.kind === 'plain' ? token.text : <span key={i} className={`syntax-${token.kind}`}>{token.text}</span>)}</code></pre></figure>;
}
