import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Glyphes des touches modificatrices, comme dans le design system. */
const GLYPHS: Record<string, string> = {
  cmd: '⌘',
  shift: '⇧',
  alt: '⌥',
  ctrl: '⌃',
  enter: '↵',
  esc: 'esc',
  tab: '⇥',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→'
};

/** Raccourci clavier Établi. `keys` accepte une combinaison, ex. `cmd+k`. */
@Component({
  selector: 'app-kbd',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'etb-kbd-group' },
  template: `
    @for (k of glyphs(); track $index) {
      <kbd class="etb-kbd">{{ k }}</kbd>
    }
  `
})
export class KbdComponent {
  readonly keys = input.required<string>();

  protected readonly glyphs = computed(() =>
    this.keys()
      .split('+')
      .map((k) => GLYPHS[k.toLowerCase()] ?? k)
  );
}
