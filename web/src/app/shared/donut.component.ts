import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface Arc {
  label: string;
  color: string;
  dash: number;
  gap: number;
  offset: number;
}

@Component({
  selector: 'app-donut',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
      [attr.width]="size()"
      [attr.height]="size()"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      <g [attr.transform]="'rotate(-90 ' + center() + ' ' + center() + ')'">
        <circle
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke-width]="stroke()"
          stroke="var(--surface-2)"
        />
        @for (a of arcs(); track a.label) {
          <circle
            [attr.cx]="center()"
            [attr.cy]="center()"
            [attr.r]="radius()"
            fill="none"
            [attr.stroke-width]="stroke()"
            [attr.stroke]="a.color"
            stroke-linecap="butt"
            [attr.stroke-dasharray]="a.dash + ' ' + a.gap"
            [attr.stroke-dashoffset]="a.offset"
          />
        }
      </g>
      <text [attr.x]="center()" [attr.y]="center() - 2" text-anchor="middle" dominant-baseline="central" class="total">
        {{ total() }}
      </text>
      @if (centerLabel()) {
        <text [attr.x]="center()" [attr.y]="center() + 16" text-anchor="middle" class="sub">{{ centerLabel() }}</text>
      }
    </svg>
  `,
  styles: [
    `
      svg {
        display: block;
      }
      .total {
        fill: var(--text);
        font-size: 26px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
      }
      .sub {
        fill: var(--faint, var(--text-dim));
        font-size: 11px;
        font-family: var(--font-mono);
      }
    `
  ]
})
export class DonutComponent {
  readonly segments = input<DonutSegment[]>([]);
  readonly size = input<number>(130);
  readonly stroke = input<number>(22);
  readonly centerLabel = input<string>('sujets');

  readonly center = computed(() => this.size() / 2);
  readonly radius = computed(() => (this.size() - this.stroke()) / 2);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());
  readonly total = computed(() => this.segments().reduce((s, x) => s + x.value, 0));

  readonly ariaLabel = computed(() => {
    const total = this.total();
    return `Répartition : ${total} ${this.centerLabel()}`;
  });

  readonly arcs = computed<Arc[]>(() => {
    const c = this.circumference();
    const total = this.total() || 1;
    let cumulative = 0;
    return this.segments()
      .filter((s) => s.value > 0)
      .map((s) => {
        const dash = (s.value / total) * c;
        const offset = -((cumulative / total) * c);
        cumulative += s.value;
        return { label: s.label, color: s.color, dash, gap: c - dash, offset };
      });
  });
}
