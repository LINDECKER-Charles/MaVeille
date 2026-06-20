import { Injectable } from '@angular/core';
import {
  digests,
  stats,
  totals,
  categoryRegistry,
  weeklies
} from '../data/generated/index';
import { digestLoaders } from '../data/generated/loaders';
import type {
  CategoryRegistryEntry,
  DigestMeta,
  OverallStats,
  RenderedDigest,
  WeeklyReport
} from '../data/types';

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

  /** Accent color for a category, falling back to the registry default. */
  accentFor(name: string): string {
    return this.registryByName.get(name)?.accent ?? 'var(--accent)';
  }

  labelFor(name: string): string {
    return this.registryByName.get(name)?.label ?? name;
  }

  weekly(id: string): WeeklyReport | undefined {
    return this.weeklies.find((w) => w.id === id);
  }
}
