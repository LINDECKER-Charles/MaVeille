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

export interface DetailSnippet {
  /** Topic index extracted from `## N. …` (kept as string to preserve original formatting) */
  index: string;
  /** Topic title (H2 text minus the leading number) */
  title: string;
  /** Source name parsed from `**Source :** … — <url>` */
  source?: string;
  /** Optional URL parsed from the source line */
  sourceUrl?: string;
  /** Raw date string parsed from `**Date :** …` */
  date?: string;
  /** Sanitized HTML of the topic body (meta lines + leading separators stripped) */
  bodyHtml: string;
  /** Best-effort one-line preview pulled from the first body paragraph */
  preview?: string;
}

const SOURCE_LINE = /^[*_]{2}Source\s*:[*_]{2}\s*([^\n]+?)(?:\s*[—–]\s*(https?:\S+))?\s*$/m;
const DATE_LINE = /^[*_]{2}Date\s*:[*_]{2}\s*([^\n]+?)\s*$/m;
const TRAILING_HR = /\n\s*-{3,}\s*$/;

function stripFirst(input: string, match: RegExpMatchArray | null): string {
  return match ? input.replace(match[0], '') : input;
}

function buildPreview(body: string): string | undefined {
  const firstPara = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('---'));
  if (!firstPara) return undefined;
  const flat = firstPara
    .replace(/[*_`]/g, '')
    .replace(/\[(.+?)]\((.+?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > 180 ? flat.slice(0, 177).trimEnd() + '…' : flat;
}

/**
 * Split a detail markdown body into per-topic snippets, splitting on `## N. …` headings.
 * Returns an empty array if no numbered H2 is found — caller should fall back to full HTML.
 */
export function splitDetailIntoSnippets(md: string): DetailSnippet[] {
  const parts = md.split(/^##\s+/m);
  const snippets: DetailSnippet[] = [];

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const newlineAt = chunk.indexOf('\n');
    const firstLine = newlineAt === -1 ? chunk : chunk.slice(0, newlineAt);
    const rest = newlineAt === -1 ? '' : chunk.slice(newlineAt + 1);

    const numMatch = firstLine.match(/^(\d+)\.\s+(.+?)\s*$/);
    if (!numMatch) continue;

    const sourceMatch = rest.match(SOURCE_LINE);
    const dateMatch = rest.match(DATE_LINE);

    let body = stripFirst(rest, sourceMatch);
    body = stripFirst(body, dateMatch);
    body = body.replace(TRAILING_HR, '').replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n').trimEnd();

    snippets.push({
      index: numMatch[1],
      title: numMatch[2].trim(),
      source: sourceMatch?.[1]?.trim(),
      sourceUrl: sourceMatch?.[2]?.trim(),
      date: dateMatch?.[1]?.trim(),
      bodyHtml: renderMarkdown(body),
      preview: buildPreview(body)
    });
  }

  return snippets;
}
