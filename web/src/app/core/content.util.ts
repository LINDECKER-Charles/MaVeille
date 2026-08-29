/**
 * Opérations de lecture sur le corps HTML d'un sujet. Ce HTML est produit et
 * assaini au build ; on ne fait qu'en extraire des vues (sommaire, code seul,
 * liens) ou y poser des ancres — jamais y injecter de contenu externe.
 */

export interface TocEntry {
  readonly id: string;
  readonly label: string;
}

const H3 = /<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi;

/** Texte brut d'un fragment HTML, entités courantes décodées. */
function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Identifiant d'ancre stable : ASCII, minuscules, tirets. */
function anchorId(label: string, position: number): string {
  const slug = label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `s-${position}-${slug || 'section'}`;
}

/**
 * Ajoute un `id` à chaque `<h3>` du corps et renvoie le sommaire correspondant.
 * Les titres qui portent déjà un `id` sont laissés tels quels.
 */
export function withAnchors(bodyHtml: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  let position = 0;

  const html = bodyHtml.replace(H3, (match, attrs: string | undefined, inner: string) => {
    const label = plain(inner);
    if (!label) return match;

    position += 1;
    const existing = attrs?.match(/\sid="([^"]+)"/i)?.[1];
    const id = existing ?? anchorId(label, position);
    toc.push({ id, label });

    return existing ? match : `<h3${attrs ?? ''} id="${id}">${inner}</h3>`;
  });

  return { html, toc };
}

/** Un lien cité dans le corps d'un sujet. */
export interface ContentLink {
  readonly href: string;
  readonly label: string;
}

const PRE = /<pre[\s\S]*?<\/pre>/gi;
/** Les diagrammes Mermaid arrivent aussi en `<pre>` — ce sont des illustrations. */
const MERMAID = /^<pre[^>]*class="[^"]*\bmermaid\b/i;
const ANCHOR = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

/**
 * Les seuls blocs de code du corps, dans l'ordre, chacun précédé du titre de
 * section qui l'introduit quand il y en a un. Alimente la vue « Code seul ».
 */
export function extractCodeBlocks(bodyHtml: string): string[] {
  const blocks: string[] = [];
  let lastHeading = '';
  let cursor = 0;

  for (const match of bodyHtml.matchAll(PRE)) {
    const at = match.index ?? 0;
    const heading = [...bodyHtml.slice(cursor, at).matchAll(H3)].pop();
    if (heading) lastHeading = plain(heading[2]);
    cursor = at + match[0].length;
    if (MERMAID.test(match[0])) continue;
    blocks.push(lastHeading ? `<h3>${lastHeading}</h3>${match[0]}` : match[0]);
    lastHeading = '';
  }

  return blocks;
}

/** Liens externes cités dans le corps, dédoublonnés par URL. */
export function extractLinks(bodyHtml: string): ContentLink[] {
  const byHref = new Map<string, ContentLink>();
  for (const [, href, inner] of bodyHtml.matchAll(ANCHOR)) {
    if (!/^https?:/i.test(href) || byHref.has(href)) continue;
    byHref.set(href, { href, label: plain(inner) || href });
  }
  return [...byHref.values()];
}

/** Première phrase utile d'un fragment HTML — sert d'accroche de catégorie. */
export function firstSentenceOf(html: string, maxLen = 180): string {
  const paragraph = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? html;
  const flat = plain(paragraph);
  if (!flat) return '';

  const end = flat.search(/[.!?](?:\s|$)/);
  let sentence = end === -1 ? flat : flat.slice(0, end + 1);
  if (sentence.length > maxLen) {
    const cut = sentence.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    sentence = `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
  }
  return sentence;
}
