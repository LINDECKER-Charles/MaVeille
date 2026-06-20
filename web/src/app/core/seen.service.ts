import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'veille-last-seen-date';

/**
 * Tracks the most recent digest date the user has already seen. Anything
 * strictly more recent counts as "new". Ports seen.svelte.ts 1:1.
 */
@Injectable({ providedIn: 'root' })
export class SeenService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly lastSeen = signal<string | null>(null);
  private hydrated = false;

  constructor() {
    if (this.isBrowser) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
        this.lastSeen.set(stored);
      }
      this.hydrated = true;
    }
  }

  /** Reactive accessor (read inside templates / computed to track changes). */
  get lastSeenDate(): string | null {
    return this.lastSeen();
  }

  /** True if `date` is more recent than the last seen marker. */
  isNew(date: string): boolean {
    if (!this.hydrated) return false; // SSR: never claim "new" before hydration
    const ls = this.lastSeen();
    if (!ls) return true; // first visit -> everything is new
    return date > ls;
  }

  /** Mark digests up to and including `date` as seen. No-op if older. */
  acknowledge(date: string): void {
    if (!this.isBrowser) return;
    const ls = this.lastSeen();
    if (ls && date <= ls) return;
    this.lastSeen.set(date);
    localStorage.setItem(STORAGE_KEY, date);
  }

  /** Count of dates strictly newer than lastSeen. */
  countNew(dates: string[]): number {
    if (!this.hydrated || dates.length === 0) return 0;
    const ls = this.lastSeen();
    if (!ls) return dates.length;
    return dates.filter((d) => d > ls).length;
  }

  /** Forget the seen marker — everything becomes new again. */
  reset(): void {
    if (!this.isBrowser) return;
    this.lastSeen.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }
}
