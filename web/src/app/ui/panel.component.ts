import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';
import { IconName } from './icon.data';

/**
 * Panneau Établi — une section titrée avec un corps qui défile.
 * `actions` est un point d'insertion nommé pour les commandes de l'en-tête :
 * `<app-button actions>…</app-button>`.
 */
@Component({
  selector: 'app-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  // `title` est aussi un attribut HTML global : Angular l'écrit sur l'hôte en
  // plus de l'affecter à l'input, ce qui collerait une infobulle native sur
  // toute la surface du panneau. On la neutralise ici, une fois pour toutes.
  host: { class: 'etb-panel', '[attr.title]': 'null' },
  template: `
    <header class="etb-panel__header">
      @if (icon(); as ic) {
        <app-icon [name]="ic" [size]="14" style="color: var(--text-muted)" />
      }
      <h3 class="etb-panel__title">{{ title() }}</h3>
      <span class="etb-panel__spacer"></span>
      <ng-content select="[actions]" />
    </header>
    <div class="etb-panel__body">
      <ng-content />
    </div>
  `
})
export class PanelComponent {
  readonly title = input.required<string>();
  readonly icon = input<IconName | null>(null);
}
