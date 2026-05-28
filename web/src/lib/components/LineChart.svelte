<script lang="ts">
  import type { DayActivity } from '$lib/types';

  let { data, height = 160 }: { data: DayActivity[]; height?: number } = $props();

  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;
  const width = 720;

  const chartW = width - PAD_L - PAD_R;
  const chartH = $derived(height - PAD_T - PAD_B);
  const empty = $derived(data.length === 0);
  const n = $derived(data.length);
  const max = $derived(empty ? 1 : Math.max(1, ...data.map((d) => d.subjects)));

  function xPos(i: number, count: number): number {
    if (count <= 1) return PAD_L + chartW / 2;
    return PAD_L + (i * chartW) / (count - 1);
  }
  function yPos(v: number, m: number, h: number): number {
    return PAD_T + h - (v / m) * h;
  }

  const pts = $derived(
    data.map((d, i) => `${xPos(i, n)},${yPos(d.subjects, max, chartH)}`).join(' ')
  );

  const areaPath = $derived(
    empty
      ? ''
      : `M ${xPos(0, n)},${PAD_T + chartH} L ${pts.replace(/ /g, ' L ')} L ${xPos(n - 1, n)},${PAD_T + chartH} Z`
  );

  const ticks = $derived([0, Math.ceil(max / 2), max]);
  const step = $derived(Math.max(1, Math.ceil(n / 6)));

  function shortDate(iso: string): string {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }
</script>

<svg
  viewBox="0 0 {width} {height}"
  role="img"
  aria-label="Évolution du nombre de sujets par jour"
  preserveAspectRatio="xMidYMid meet"
>
  <!-- Y grid + labels -->
  {#each ticks as t}
    {@const y = yPos(t, max, chartH)}
    <line x1={PAD_L} x2={width - PAD_R} y1={y} y2={y} class="grid" />
    <text x={PAD_L - 6} y={y + 3} text-anchor="end" class="axis">{t}</text>
  {/each}

  {#if !empty}
    <path d={areaPath} class="area" />
    <polyline points={pts} fill="none" class="line" />
    {#each data as d, i}
      <g>
        <circle cx={xPos(i, n)} cy={yPos(d.subjects, max, chartH)} r="3" class="dot" />
        <title>{d.date} — {d.subjects} sujet{d.subjects > 1 ? 's' : ''}</title>
      </g>
    {/each}
    {#each data as d, i}
      {#if i % step === 0 || i === n - 1}
        <text x={xPos(i, n)} y={height - 6} text-anchor="middle" class="axis">{shortDate(d.date)}</text>
      {/if}
    {/each}
  {:else}
    <text x={width / 2} y={height / 2} text-anchor="middle" class="axis-empty">
      Aucune donnée
    </text>
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .grid {
    stroke: var(--border);
    stroke-width: 0.5;
    stroke-dasharray: 2 4;
  }
  .axis {
    fill: var(--text-dim);
    font-size: 10px;
    font-family: var(--font-mono);
  }
  .axis-empty {
    fill: var(--text-dim);
    font-size: 12px;
  }
  .line {
    stroke: var(--accent);
    stroke-width: 1.8;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .area {
    fill: var(--accent);
    fill-opacity: 0.15;
  }
  .dot {
    fill: var(--bg-elevated);
    stroke: var(--accent);
    stroke-width: 1.5;
  }
</style>
