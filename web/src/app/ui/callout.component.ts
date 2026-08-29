import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from './icon.component';
import { IconName } from './icon.data';

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/** Icône par défaut de chaque tonalité, comme dans le design system. */
const TONE_ICONS: Record<CalloutTone, IconName> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  danger: 'circle-alert',
  neutral: 'info'
};

/** Encadré Établi — met en avant un point sans casser le fil de lecture. */
@Component({
  selector: 'app-callout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    class: 'etb-callout',
    '[class.etb-callout--success]': 'tone() === "success"',
    '[class.etb-callout--warning]': 'tone() === "warning"',
    '[class.etb-callout--danger]': 'tone() === "danger"',
    '[class.etb-callout--neutral]': 'tone() === "neutral"'
  },
  template: `
    <app-icon class="etb-callout__icon" [name]="resolvedIcon()" [size]="15" />
    <div>
      @if (title(); as t) {
        <div class="etb-callout__title">{{ t }}</div>
      }
      <div><ng-content /></div>
    </div>
  `
})
export class CalloutComponent {
  readonly tone = input<CalloutTone>('info');
  readonly title = input<string | null>(null);
  readonly icon = input<IconName | null>(null);

  protected readonly resolvedIcon = computed(() => this.icon() ?? TONE_ICONS[this.tone()]);
}
