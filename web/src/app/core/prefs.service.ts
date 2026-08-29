import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Depth = 'syn' | 'det';

const DEPTH_KEY = 'veille-depth';

/**
 * Préférences de lecture. Une seule aujourd'hui : la profondeur du briefing
 * (synthèses ou liste des sujets), persistée dans localStorage et SSR-safe.
 * Calqué sur ThemeService.
 */
@Injectable({ providedIn: 'root' })
export class PrefsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Par défaut le briefing liste les sujets : c'est le parcours de lecture
  // (briefing → sujet → suivant). « Synthèse » reste à un clic.
  private readonly _depth = signal<Depth>('det');
  readonly depth = this._depth.asReadonly();

  /** Résout la profondeur depuis le storage au boot. */
  init(): void {
    if (!this.isBrowser) return;
    const saved = localStorage.getItem(DEPTH_KEY);
    if (saved === 'det' || saved === 'syn') this._depth.set(saved);
  }

  setDepth(d: Depth): void {
    this._depth.set(d);
    if (this.isBrowser) {
      localStorage.setItem(DEPTH_KEY, d);
    }
  }
}
