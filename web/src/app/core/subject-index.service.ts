import { Injectable, signal } from '@angular/core';
import type { SubjectEntry } from '../data/types';

/** Clé stable d'un sujet dans une journée, ex. `ia-3`. Sert de query param. */
export function subjectKey(slug: string, index: string): string {
  return `${slug}-${index}`;
}

/** Normalise pour la recherche : minuscules, sans accents. */
function fold(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Index plat de tous les sujets, chargé à la demande.
 *
 * Le fichier `subject-index.json` (~140 ko) est code-splitté par esbuild : il ne
 * pèse pas sur le bundle initial. Le fil « tous les sujets » et la palette ⌘K
 * s'appuient dessus ; tout le reste de l'app continue de lire `digests`.
 */
@Injectable({ providedIn: 'root' })
export class SubjectIndexService {
  private entries: SubjectEntry[] | null = null;
  private loading: Promise<SubjectEntry[]> | null = null;

  /** Index résolu, ou tableau vide tant que le chargement n'a pas abouti. */
  readonly all = signal<readonly SubjectEntry[]>([]);

  /** Charge l'index une seule fois ; les appels concurrents partagent la promesse. */
  async load(): Promise<readonly SubjectEntry[]> {
    if (this.entries) return this.entries;
    this.loading ??= import('../data/generated/subject-index.json').then((m) => {
      this.entries = (m.default ?? m) as unknown as SubjectEntry[];
      this.all.set(this.entries);
      return this.entries;
    });
    return this.loading;
  }

  /**
   * Recherche par titre, tolérante à la casse et aux accents. Chaque mot de la
   * requête doit apparaître. Un titre qui *commence* par la requête passe
   * devant ; à égalité, le plus récent gagne — c'est l'ordre du reste de l'app,
   * et un classement par position de match serait invisible pour le lecteur.
   */
  search(query: string, limit = 8): SubjectEntry[] {
    const words = fold(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const scored: { entry: SubjectEntry; leads: boolean }[] = [];
    for (const entry of this.all()) {
      const title = fold(entry.title);
      if (!words.every((w) => title.includes(w))) continue;
      scored.push({ entry, leads: title.startsWith(words[0]) });
    }

    return scored
      .sort((a, b) => {
        if (a.leads !== b.leads) return a.leads ? -1 : 1;
        return a.entry.date < b.entry.date ? 1 : a.entry.date > b.entry.date ? -1 : 0;
      })
      .slice(0, limit)
      .map((s) => s.entry);
  }
}
