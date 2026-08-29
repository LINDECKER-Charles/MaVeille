import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from './icon.component';
import { IconName } from './icon.data';

export interface SegmentOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconName;
}

/**
 * Contrôle segmenté Établi — un choix parmi n, toutes les options visibles.
 *
 * `value` est un `model()` : utilisable en liaison bidirectionnelle
 * (`[(value)]`) ou en lecture seule avec `(valueChange)`.
 */
@Component({
  selector: 'app-segmented-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    class: 'etb-seg',
    '[class.etb-seg--sm]': 'size() === "sm"',
    role: 'tablist',
    '[attr.aria-label]': 'label()'
  },
  template: `
    @for (o of options(); track o.value) {
      <button
        type="button"
        role="tab"
        class="etb-seg__item"
        [class.etb-seg__item--on]="o.value === value()"
        [attr.aria-selected]="o.value === value()"
        (click)="value.set(o.value)"
      >
        @if (o.icon; as ic) {
          <app-icon [name]="ic" [size]="13" />
        }
        {{ o.label }}
      </button>
    }
  `
})
export class SegmentedControlComponent<T extends string = string> {
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = model.required<T>();
  readonly size = input<'sm' | 'md'>('md');
  readonly label = input<string>('Vue');
}
