import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const SUFFIX = ' — Veille';

/**
 * Titre et description de la page courante. Le site étant prérendu, ces deux
 * balises sont figées dans le HTML de chaque route : c'est ce que voient les
 * moteurs et les aperçus de lien, sans exécuter de JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class PageMetaService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  set(title: string, description: string): void {
    this.title.setTitle(title.endsWith(SUFFIX) ? title : title + SUFFIX);
    this.meta.updateTag({ name: 'description', content: description });
  }
}
