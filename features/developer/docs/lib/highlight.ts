import type { CodeLanguage } from './content-schema';
type Kind = 'plain' | 'string' | 'comment' | 'keyword' | 'number';
export function highlightCode(code: string, _language: CodeLanguage): { text: string; kind: Kind }[] {
  // Presentation-only lexer for trusted authored examples; tokens are always
  // rendered as escaped React text, never parsed or executed as HTML/code.
  const pattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/[^\n]*|\#[^\n]*|\/\*[\s\S]*?\*\/)|\b(const|let|var|await|async|new|return|if|else|import|from|export|public|private|using|class|void|true|false|null|GET|POST|PUT|PATCH|DELETE|HTTP)\b|\b(\d+(?:\.\d+)?)\b/g;
  const tokens: { text: string; kind: Kind }[] = []; let cursor = 0;
  for (const match of code.matchAll(pattern)) {
    if (match.index > cursor) tokens.push({ text: code.slice(cursor, match.index), kind: 'plain' });
    tokens.push({ text: match[0], kind: match[1] ? 'string' : match[2] ? 'comment' : match[3] ? 'keyword' : 'number' });
    cursor = match.index + match[0].length;
  }
  if (cursor < code.length) tokens.push({ text: code.slice(cursor), kind: 'plain' });
  return tokens;
}
