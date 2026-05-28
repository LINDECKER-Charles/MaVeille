import { error } from '@sveltejs/kit';
import { getDigest, listDigestMeta } from '$lib/digests';
import { renderMarkdown, splitDetailIntoSnippets, stripLeadingH1, type DetailSnippet } from '$lib/markdown';
import type { CategoryEntry } from '$lib/types';

interface RenderedCategory {
  category: string;
  syntheseHtml?: string;
  detailHtml?: string;
  detailSnippets?: DetailSnippet[];
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

  const categories: RenderedCategory[] = digest.entries.map((e: CategoryEntry) => {
    let syntheseHtml: string | undefined;
    let detailHtml: string | undefined;
    let detailSnippets: DetailSnippet[] | undefined;

    if (e.synthese) {
      syntheseHtml = renderMarkdown(stripLeadingH1(e.synthese).body);
    }
    if (e.detail) {
      const { body } = stripLeadingH1(e.detail);
      const snippets = splitDetailIntoSnippets(body);
      if (snippets.length > 0) {
        detailSnippets = snippets;
      } else {
        detailHtml = renderMarkdown(body);
      }
    }

    return { category: e.category, syntheseHtml, detailHtml, detailSnippets };
  });

  return {
    date: digest.date,
    recapTitle,
    recapHtml,
    categories
  };
};
