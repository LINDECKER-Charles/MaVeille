import { browser } from '$app/environment';

const STORAGE_KEY = 'veille-last-seen-date';

/**
 * Stateful module that tracks the most recent digest date the user has
 * already seen. Anything strictly more recent counts as "new".
 *
 * Uses Svelte 5 runes — consumers must read `lastSeen` from inside a
 * reactive context to be notified of changes.
 */
class SeenStore {
  #lastSeen = $state<string | null>(null);
  #hydrated = false;

  constructor() {
    if (browser) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
        this.#lastSeen = stored;
      }
      this.#hydrated = true;
    }
  }

  get lastSeen(): string | null {
    return this.#lastSeen;
  }

  /** Returns true if `date` is more recent than the last seen marker. */
  isNew(date: string): boolean {
    if (!this.#hydrated) return false; // SSR: never claim "new" before hydration
    if (!this.#lastSeen) return true; // first visit → everything is new
    return date > this.#lastSeen;
  }

  /** Mark digests up to and including `date` as seen. No-op if older. */
  acknowledge(date: string): void {
    if (!browser) return;
    if (this.#lastSeen && date <= this.#lastSeen) return;
    this.#lastSeen = date;
    localStorage.setItem(STORAGE_KEY, date);
  }

  /** Count of dates in the given list that are strictly newer than lastSeen. */
  countNew(dates: string[]): number {
    if (!this.#hydrated || dates.length === 0) return 0;
    if (!this.#lastSeen) return dates.length;
    return dates.filter((d) => d > this.#lastSeen!).length;
  }

  /** Forget the seen marker — everything becomes new again. */
  reset(): void {
    if (!browser) return;
    this.#lastSeen = null;
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const seen = new SeenStore();
