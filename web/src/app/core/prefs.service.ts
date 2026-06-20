import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Density = 'comfort' | 'compact';
export type Depth = 'syn' | 'det';

const DENSITY_KEY = 'veille-density';
const DEPTH_KEY = 'veille-depth';

/**
 * Préférences utilisateur (densité d'affichage + profondeur de lecture du digest).
 * Persistées dans localStorage, SSR-safe. La densité est mirrorée sur
 * <html data-density> ; la profondeur est lue/écrite par la vue digest.
 * Calqué sur ThemeService.
 */
@Injectable({ providedIn: 'root' })
export class PrefsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _density = signal<Density>('comfort');
  readonly density = this._density.asReadonly();

  private readonly _depth = signal<Depth>('syn');
  readonly depth = this._depth.asReadonly();

  /** Résout densité + profondeur depuis le storage et applique au boot. */
  init(): void {
    if (!this.isBrowser) return;

    const savedDensity = localStorage.getItem(DENSITY_KEY);
    this.applyDensity(savedDensity === 'compact' ? 'compact' : 'comfort');

    const savedDepth = localStorage.getItem(DEPTH_KEY);
    this._depth.set(savedDepth === 'det' ? 'det' : 'syn');
  }

  setDensity(d: Density): void {
    this.applyDensity(d);
  }

  toggleDensity(): void {
    this.applyDensity(this._density() === 'comfort' ? 'compact' : 'comfort');
  }

  setDepth(d: Depth): void {
    this._depth.set(d);
    if (this.isBrowser) {
      localStorage.setItem(DEPTH_KEY, d);
    }
  }

  private applyDensity(d: Density): void {
    this._density.set(d);
    if (this.isBrowser) {
      document.documentElement.setAttribute('data-density', d);
      localStorage.setItem(DENSITY_KEY, d);
    }
  }
}
