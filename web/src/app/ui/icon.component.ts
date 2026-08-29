import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, IconName, IconShape } from './icon.data';

/**
 * Icône Établi. Rend un SVG 24×24 mis à l'échelle, coloré par `currentColor`.
 *
 * Décorative par défaut (`aria-hidden`). Passer `label` la promeut en `img`
 * nommée — à ne faire que si l'icône porte une information qu'aucun texte
 * voisin ne donne déjà.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'etb-icon',
    '[class.etb-icon--spin]': 'spin()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[attr.role]': 'label() ? "img" : "presentation"',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"'
  },
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      @for (s of shapes(); track $index) {
        @switch (s.t) {
          @case ('p') {
            <svg:path [attr.d]="$any(s).d" />
          }
          @case ('c') {
            <svg:circle [attr.cx]="$any(s).cx" [attr.cy]="$any(s).cy" [attr.r]="$any(s).r" />
          }
          @case ('l') {
            <svg:line
              [attr.x1]="$any(s).x1"
              [attr.y1]="$any(s).y1"
              [attr.x2]="$any(s).x2"
              [attr.y2]="$any(s).y2"
            />
          }
          @case ('r') {
            <svg:rect
              [attr.x]="$any(s).x"
              [attr.y]="$any(s).y"
              [attr.width]="$any(s).w"
              [attr.height]="$any(s).h"
              [attr.rx]="$any(s).rx"
            />
          }
          @case ('e') {
            <svg:ellipse
              [attr.cx]="$any(s).cx"
              [attr.cy]="$any(s).cy"
              [attr.rx]="$any(s).rx"
              [attr.ry]="$any(s).ry"
            />
          }
        }
      }
    </svg>
  `
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(16);
  readonly spin = input(false);
  /** Nom accessible ; omis, l'icône reste décorative. */
  readonly label = input<string | null>(null);

  protected readonly shapes = computed<readonly IconShape[]>(() => ICONS[this.name()]);
}
