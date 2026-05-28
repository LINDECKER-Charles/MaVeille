import { listDigestMeta } from '$lib/digests';

export const load = () => {
  const digests = listDigestMeta();
  return {
    digests,
    totals: {
      digests: digests.length,
      subjects: digests.reduce((s, d) => s + d.totalSubjects, 0),
      sources: digests.reduce((s, d) => s + d.totalSources, 0)
    }
  };
};
