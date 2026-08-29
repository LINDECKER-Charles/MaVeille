import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from './icon.component';
import { IconName } from './icon.data';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Bouton Établi.
 *
 * L'hôte s'aligne sur le `<button>` interne (`inline-flex`) plutôt que d'être
 * transparent : une classe posée sur `<app-button>` reste ainsi un vrai élément
 * cliquable et mesurable. Les clics remontent naturellement — `(click)` sur
 * l'hôte marche.
 *
 * Pour un lien qui doit *ressembler* à un bouton, ne pas passer par ce
 * composant : poser les classes du design system sur l'ancre
 * (`<a class="etb-btn etb-btn--secondary etb-btn--sm" routerLink="…">`).
 */
@Component({
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { '[class.app-button--block]': 'block()' },
  styles: `
    :host {
      display: inline-flex;
      max-width: 100%;
    }

    :host(.app-button--block) {
      display: flex;
      width: 100%;
    }
  `,
  template: `
    <button [class]="classes()" [type]="type()" [disabled]="disabled()">
      @if (iconLeft(); as ic) {
        <app-icon [name]="ic" [size]="glyph()" />
      }
      <ng-content />
      @if (iconRight(); as ic) {
        <app-icon [name]="ic" [size]="glyph()" />
      }
    </button>
  `
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly iconLeft = input<IconName | null>(null);
  readonly iconRight = input<IconName | null>(null);
  readonly block = input(false);
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit'>('button');

  protected readonly glyph = computed(() => (this.size() === 'lg' ? 16 : 14));

  protected readonly classes = computed(() => {
    const cls = ['etb-btn', `etb-btn--${this.variant()}`];
    if (this.size() !== 'md') cls.push(`etb-btn--${this.size()}`);
    if (this.block()) cls.push('etb-btn--block');
    return cls.join(' ');
  });
}
