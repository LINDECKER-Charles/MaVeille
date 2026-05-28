import { listDigestMeta } from '$lib/digests';

export const load = () => {
  return {
    digests: listDigestMeta()
  };
};
