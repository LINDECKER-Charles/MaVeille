import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from './icon.component';
import { IconName } from './icon.data';

/**
 * Bouton icône Établi. `label` est obligatoire : sans texte visible, c'est lui
 * qui nomme la commande pour les lecteurs d'écran et alimente l'infobulle.
 */
@Component({
  selector: 'app-icon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  styles: `
    :host {
      display: inline-flex;
    }
  `,
  template: `
    <button
      [class]="classes()"
      type="button"
      [attr.aria-label]="label()"
      [attr.aria-pressed]="active() ? 'true' : null"
      [attr.title]="label()"
      [disabled]="disabled()"
    >
      <app-icon [name]="icon()" [size]="size() === 'sm' ? 14 : 16" />
    </button>
  `
})
export class IconButtonComponent {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly variant = input<'ghost' | 'bordered'>('ghost');
  readonly active = input(false);
  readonly disabled = input(false);

  protected readonly classes = computed(() => {
    const cls = ['etb-iconbtn'];
    if (this.size() !== 'md') cls.push(`etb-iconbtn--${this.size()}`);
    if (this.variant() === 'bordered') cls.push('etb-iconbtn--bordered');
    if (this.active()) cls.push('etb-iconbtn--active');
    return cls.join(' ');
  });
}
