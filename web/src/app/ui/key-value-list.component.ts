import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface KeyValueItem {
  readonly label: string;
  readonly value: string;
}

/**
 * Liste clé/valeur Établi — les métadonnées d'un sujet, d'un jour, d'un rapport.
 * L'hôte est en `display: contents` pour que la grille porte sur le `<dl>` :
 * `dt`/`dd` doivent rester des enfants directs de leur liste de définitions.
 */
@Component({
  selector: 'app-key-value-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: contents;
    }
  `,
  template: `
    <dl class="etb-kv" [class.etb-kv--bordered]="bordered()">
      @for (it of items(); track it.label) {
        <dt>{{ it.label }}</dt>
        <dd>{{ it.value }}</dd>
      }
    </dl>
  `
})
export class KeyValueListComponent {
  readonly items = input.required<readonly KeyValueItem[]>();
  readonly bordered = input(false);
}
