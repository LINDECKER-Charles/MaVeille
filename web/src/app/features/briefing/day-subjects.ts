import { DigestStore } from '../../core/digest-store.service';
import { domainOf } from '../../core/source.util';
import { subjectKey } from '../../core/subject-index.service';
import { firstSentenceOf } from '../../core/content.util';
import type { RenderedDigest } from '../../data/types';

/** Un sujet d'une journée, prêt à l'affichage — la ligne du briefing et la page de lecture. */
export interface DaySubject {
  /** Clé d'URL, ex. `ia-3`. */
  readonly key: string;
  readonly slug: string;
  readonly category: string;
  readonly label: string;
  readonly mono: string;
  readonly index: string;
  /** Rang du sujet dans la journée, toutes thématiques confondues (1-based). */
  readonly position: number;
  readonly title: string;
  readonly domain: string;
  readonly source?: string;
  readonly sourceUrl?: string;
  /** Date de publication telle qu'écrite dans le rapport (français libre). */
  readonly published?: string;
  readonly readingMinutes: number;
  readonly bodyHtml: string;
}

/** Une accroche par thématique — le bloc « à retenir » du briefing. */
export interface DayTakeaway {
  readonly mono: string;
  readonly label: string;
  readonly text: string;
}

/** Une synthèse par thématique, pour la vue « Synthèse » du briefing. */
export interface DaySynthesis {
  readonly mono: string;
  readonly label: string;
  readonly html: string;
  readonly minutes: number;
}

/** Aplatit un digest rendu en sujets, catégories triées puis numéro croissant. */
export function toDaySubjects(digest: RenderedDigest, store: DigestStore): DaySubject[] {
  const out: DaySubject[] = [];

  for (const cat of digest.categories) {
    const slug = store.slugFor(cat.category);
    const mono = store.monogramFor(cat.category);
    const label = store.labelFor(cat.category);

    for (const s of cat.detailSnippets ?? []) {
      out.push({
        key: subjectKey(slug, s.index),
        slug,
        category: cat.category,
        label,
        mono,
        index: s.index,
        position: out.length + 1,
        title: s.title,
        domain: domainOf(s.sourceUrl, s.source),
        source: s.source,
        sourceUrl: s.sourceUrl,
        published: s.date,
        readingMinutes: s.readingMinutes,
        bodyHtml: s.bodyHtml
      });
    }
  }

  return out;
}

/** Une accroche par catégorie ayant une synthèse. */
export function toTakeaways(digest: RenderedDigest, store: DigestStore): DayTakeaway[] {
  const out: DayTakeaway[] = [];
  for (const cat of digest.categories) {
    if (!cat.syntheseHtml) continue;
    const text = firstSentenceOf(cat.syntheseHtml);
    if (!text) continue;
    out.push({ mono: store.monogramFor(cat.category), label: store.labelFor(cat.category), text });
  }
  return out;
}

/** Les synthèses du jour, dans l'ordre des catégories. */
export function toSyntheses(digest: RenderedDigest, store: DigestStore): DaySynthesis[] {
  return digest.categories
    .filter((c) => !!c.syntheseHtml)
    .map((c) => ({
      mono: store.monogramFor(c.category),
      label: store.labelFor(c.category),
      html: c.syntheseHtml as string,
      minutes: c.syntheseMinutes ?? 1
    }));
}
