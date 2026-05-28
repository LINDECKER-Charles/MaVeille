import { computeStats } from '$lib/digests';

export const load = () => ({ stats: computeStats() });
