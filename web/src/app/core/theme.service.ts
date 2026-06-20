import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'veille-theme';

/** Dark/light theme, persisted to localStorage, mirrored on <html data-theme>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _theme = signal<Theme>('dark');
  readonly theme = this._theme.asReadonly();

  /** Resolve the initial theme from storage / OS preference and apply it. */
  init(): void {
    if (!this.isBrowser) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      this.apply(saved);
    } else if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      this.apply('light');
    } else {
      this.apply('dark');
    }
  }

  toggle(): void {
    this.apply(this._theme() === 'dark' ? 'light' : 'dark');
  }

  private apply(t: Theme): void {
    this._theme.set(t);
    if (this.isBrowser) {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(STORAGE_KEY, t);
    }
  }
}
