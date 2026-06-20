import { Injectable } from '@angular/core';
import {
  digests,
  stats,
  totals,
  categoryRegistry,
  weeklies,
  briefing
} from '../data/generated/index';
import { digestLoaders } from '../data/generated/loaders';
import type {
  Briefing,
  CategoryRegistryEntry,
  DigestMeta,
  OverallStats,
  RenderedDigest,
  WeeklyReport
} from '../data/types';

/** Slugs with first-class --cat-<slug> design tokens defined in styles.css. */
const KNOWN_SLUGS = new Set(['angular', 'csharp', 'ia', 'tech']);

/**
 * Reads the eager generated metadata and lazily loads per-day rendered content
 * through the code-split `digestLoaders` map.
 */
@Injectable({ providedIn: 'root' })
export class DigestStore {
  readonly digests: DigestMeta[] = digests;
  readonly stats: OverallStats = stats;
  readonly totals = totals;
  readonly registry: CategoryRegistryEntry[] = categoryRegistry;
  readonly weeklies: WeeklyReport[] = weeklies;
  readonly briefing: Briefing | null = briefing;

  private readonly registryByName = new Map(this.registry.map((c) => [c.name, c]));

  /** All known digest dates (newest first). */
  listDates(): string[] {
    return this.digests.map((d) => d.date);
  }

  hasDigest(date: string): boolean {
    return date in digestLoaders;
  }

  /** Lazily load the rendered content for a date. Resolves null if unknown. */
  async loadDigest(date: string): Promise<RenderedDigest | null> {
    const loader = digestLoaders[date];
    if (!loader) return null;
    const mod = await loader();
    return mod.default;
  }

  registryFor(name: string): CategoryRegistryEntry | undefined {
    return this.registryByName.get(name);
  }

  /** Registry slug, falling back to a derived lowercase-alnum slug. */
  slugFor(name: string): string {
    const slug = this.registryByName.get(name)?.slug;
    if (slug) return slug;
    const derived = name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
    return derived || 'cat';
  }

  /** Short visual badge for a category (registry monogram, else first letter). */
  monogramFor(name: string): string {
    return this.registryByName.get(name)?.monogram ?? (name.slice(0, 1) || '?').toUpperCase();
  }

  /**
   * Accent color: the `--cat-<slug>` design token when the slug is first-class,
   * otherwise the registry's per-category accent (hash fallback included).
   */
  accentFor(name: string): string {
    const slug = this.slugFor(name);
    if (KNOWN_SLUGS.has(slug)) return `var(--cat-${slug})`;
    return this.registryByName.get(name)?.accent ?? 'var(--accent)';
  }

  /**
   * Soft/translucent accent: the `--cat-<slug>-soft` token for first-class
   * categories, otherwise a transparent mix of the resolved accent.
   */
  softFor(name: string): string {
    const slug = this.slugFor(name);
    if (KNOWN_SLUGS.has(slug)) return `var(--cat-${slug}-soft)`;
    return `color-mix(in srgb, ${this.accentFor(name)} 16%, transparent)`;
  }

  labelFor(name: string): string {
    return this.registryByName.get(name)?.label ?? name;
  }

  weekly(id: string): WeeklyReport | undefined {
    return this.weeklies.find((w) => w.id === id);
  }
}
