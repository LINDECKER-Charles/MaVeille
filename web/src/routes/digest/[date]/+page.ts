import { error } from '@sveltejs/kit';
import { getDigest, listDigestMeta } from '$lib/digests';
import { renderMarkdown, stripLeadingH1 } from '$lib/markdown';
import type { CategoryEntry } from '$lib/types';

interface RenderedCategory {
  category: string;
  syntheseHtml?: string;
  detailHtml?: string;
}

// Pre-render every known digest date.
export const entries = () => listDigestMeta().map(({ date }) => ({ date }));

export const load = ({ params }: { params: { date: string } }) => {
  const digest = getDigest(params.date);
  if (!digest) throw error(404, `No digest for ${params.date}`);

  let recapTitle: string | null = null;
  let recapHtml: string | undefined;
  if (digest.recap) {
    const { title, body } = stripLeadingH1(digest.recap);
    recapTitle = title;
    recapHtml = renderMarkdown(body);
  }

  const categories: RenderedCategory[] = digest.entries.map((e: CategoryEntry) => ({
    category: e.category,
    syntheseHtml: e.synthese ? renderMarkdown(stripLeadingH1(e.synthese).body) : undefined,
    detailHtml: e.detail ? renderMarkdown(stripLeadingH1(e.detail).body) : undefined
  }));

  return {
    date: digest.date,
    recapTitle,
    recapHtml,
    categories
  };
};
