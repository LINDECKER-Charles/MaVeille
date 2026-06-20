// Single FR date utility (was duplicated across +page.svelte, digest, stats).

const FULL_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const SHORT_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

/** Parse an ISO `YYYY-MM-DD` into a local Date (no timezone drift). */
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Long French date, e.g. "vendredi 20 juin 2026". */
export function formatDateFull(iso: string): string {
  return FULL_FMT.format(parseIso(iso));
}

/** Short French date, e.g. "20 juin 2026". Returns "—" for null. */
export function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  return SHORT_FMT.format(parseIso(iso));
}

/** Relative day label, e.g. "aujourd'hui", "hier", "il y a 3 j". */
export function relativeDay(iso: string): string {
  const target = parseIso(iso).getTime();
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((todayMid - target) / 86_400_000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  if (diff < 7) return `il y a ${diff} j`;
  if (diff < 30) return `il y a ${Math.floor(diff / 7)} sem`;
  return `il y a ${Math.floor(diff / 30)} mois`;
}
