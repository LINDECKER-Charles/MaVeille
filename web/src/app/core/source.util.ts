/**
 * Extraction du domaine d'une source. Le générateur remplit déjà `domain` sur
 * les entrées de l'index des sujets ; ce helper couvre les cas où seul le
 * couple `source` / `sourceUrl` d'un `DetailSnippet` est disponible.
 */

/** Un scheme http(s), ou un hôte pointé sans espace — sinon c'est du texte libre. */
const URL_LIKE = /^https?:\/\/|^[\w-]+(?:\.[\w-]+)+(?:[/:?#]|$)/i;

/**
 * Domaine lisible d'une URL, ou le nom de source tel quel quand ce n'en est pas
 * une. Sans ce garde-fou, `new URL()` accepterait « Hugging Face » et rendrait
 * un hôte percent-encodé au lieu du nom lisible.
 */
export function domainOf(sourceUrl?: string, source?: string): string {
  const raw = (sourceUrl ?? source ?? '').trim();
  if (!raw || !URL_LIKE.test(raw)) return raw;

  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return raw;
  }
}
