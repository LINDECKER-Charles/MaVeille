import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

marked.setOptions({
  gfm: true,
  breaks: false
});

/**
 * Render a Markdown string to sanitized HTML.
 * Pre-rendered at build time (prerendering) — runs in Node.
 */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel']
  });
}

/**
 * Strip the leading H1 line (we render it separately as the page title).
 */
export function stripLeadingH1(md: string): { title: string | null; body: string } {
  const match = md.match(/^\s*#\s+(.+?)\s*\n/);
  if (!match) return { title: null, body: md };
  return {
    title: match[1].trim(),
    body: md.slice(match[0].length)
  };
}
