import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';
import { IconName } from './icon.data';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

/** Pastille Établi — étiquette courte et non cliquable. */
@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  // Classes posées une par une plutôt qu'en `[class]` global : une liaison de
  // chaîne sur l'hôte écraserait la classe que le site d'appel a posée dessus.
  host: {
    class: 'etb-badge',
    '[class.etb-badge--success]': 'tone() === "success"',
    '[class.etb-badge--warning]': 'tone() === "warning"',
    '[class.etb-badge--danger]': 'tone() === "danger"',
    '[class.etb-badge--info]': 'tone() === "info"',
    '[class.etb-badge--brand]': 'tone() === "brand"',
    '[class.etb-badge--sm]': 'size() === "sm"',
    '[class.etb-badge--solid]': 'solid()',
    '[class.etb-badge--mono]': 'mono()'
  },
  template: `
    @if (icon(); as ic) {
      <app-icon [name]="ic" [size]="11" />
    }
    <ng-content />
  `
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
  readonly size = input<'sm' | 'md'>('md');
  readonly solid = input(false);
  readonly mono = input(false);
  readonly icon = input<IconName | null>(null);
}
