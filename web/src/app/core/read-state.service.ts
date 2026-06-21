import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'veille-read-digests';

/**
 * Per-digest "lu / non lu" state. Unlike {@link SeenService} (a single
 * high-water-mark date), this keeps an explicit set of acknowledged digest ids
 * so any individual item can be toggled read/unread independently. Persisted as
 * a JSON array under `veille-read-digests`, SSR-safe.
 */
@Injectable({ providedIn: 'root' })
export class ReadStateService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly ids = signal<ReadonlySet<string>>(new Set());

  /** Reactive count of read digests. */
  readonly count = computed(() => this.ids().size);

  constructor() {
    if (this.isBrowser) this.hydrate();
  }

  /** True if `id` has been marked as read. */
  isRead(id: string): boolean {
    return this.ids().has(id);
  }

  /** Flip the read state of `id`. */
  toggle(id: string): void {
    this.setRead(id, !this.isRead(id));
  }

  /** Set the read state of `id` explicitly. */
  setRead(id: string, read: boolean): void {
    const current = this.ids();
    if (current.has(id) === read) return;
    const next = new Set(current);
    if (read) next.add(id);
    else next.delete(id);
    this.ids.set(next);
    this.persist(next);
  }

  /** Forget all read markers. */
  reset(): void {
    if (this.ids().size === 0) return;
    this.ids.set(new Set());
    this.persist(new Set());
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.ids.set(new Set(parsed.filter((x): x is string => typeof x === 'string')));
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  private persist(set: ReadonlySet<string>): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch {
      /* storage may be unavailable */
    }
  }
}
