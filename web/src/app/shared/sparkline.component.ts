import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const WIDTH = 64;
const HEIGHT = 22;
const PAD = 2;

@Component({
  selector: 'app-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!empty()) {
      <svg
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        [attr.width]="width"
        [attr.height]="height"
        role="img"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path [attr.d]="path()" fill="none" class="spark" [style.stroke]="color()" />
        <circle [attr.cx]="last().x" [attr.cy]="last().y" r="2.1" [style.fill]="color()" />
      </svg>
    }
  `,
  styles: [
    `
      svg {
        display: block;
      }
      .spark {
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `
  ]
})
export class SparklineComponent {
  readonly points = input<number[]>([]);
  readonly color = input<string>('var(--brand)');

  readonly width = WIDTH;
  readonly height = HEIGHT;

  readonly empty = computed(() => this.points().length === 0);

  private readonly coords = computed<{ x: number; y: number }[]>(() => {
    const pts = this.points();
    const n = pts.length;
    if (n === 0) return [];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const innerW = WIDTH - PAD * 2;
    const innerH = HEIGHT - PAD * 2;
    return pts.map((v, i) => ({
      x: n <= 1 ? WIDTH / 2 : PAD + (i * innerW) / (n - 1),
      y: PAD + innerH - ((v - min) / span) * innerH
    }));
  });

  readonly last = computed(() => {
    const c = this.coords();
    return c[c.length - 1] ?? { x: WIDTH / 2, y: HEIGHT / 2 };
  });

  readonly path = computed(() => {
    const c = this.coords();
    if (c.length === 0) return '';
    if (c.length === 1) return `M ${c[0].x},${c[0].y} L ${c[0].x},${c[0].y}`;
    // Catmull-Rom -> cubic bézier smoothing.
    let d = `M ${c[0].x},${c[0].y}`;
    for (let i = 0; i < c.length - 1; i++) {
      const p0 = c[i === 0 ? 0 : i - 1];
      const p1 = c[i];
      const p2 = c[i + 1];
      const p3 = c[i + 2 < c.length ? i + 2 : c.length - 1];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    return d;
  });
}
