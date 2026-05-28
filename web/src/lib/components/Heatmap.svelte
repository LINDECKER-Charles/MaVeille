<script lang="ts">
  import type { DayActivity } from '$lib/types';

  let { activity, weeks = 26 }: { activity: DayActivity[]; weeks?: number } = $props();

  const CELL = 12;
  const GAP = 3;
  const LABEL_W = 28;
  const LABEL_H = 14;

  function isoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  function startMonday(d: Date): Date {
    const r = new Date(d);
    const day = r.getDay(); // 0=Sun..6=Sat
    const offset = (day + 6) % 7;
    r.setDate(r.getDate() - offset);
    return r;
  }

  type Cell = { date: string; subjects: number; col: number; row: number };

  const today = (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  })();

  const start = $derived.by(() => {
    const lastCellMonday = startMonday(today);
    const s = new Date(lastCellMonday);
    s.setDate(s.getDate() - 7 * (weeks - 1));
    return s;
  });

  const cells = $derived.by((): Cell[] => {
    const byDate = new Map<string, number>();
    for (const a of activity) byDate.set(a.date, a.subjects);
    const result: Cell[] = [];
    for (let col = 0; col < weeks; col++) {
      for (let row = 0; row < 7; row++) {
        const d = new Date(start);
        d.setDate(start.getDate() + col * 7 + row);
        if (d > today) continue;
        const iso = isoDate(d);
        result.push({ date: iso, subjects: byDate.get(iso) ?? 0, col, row });
      }
    }
    return result;
  });

  const max = $derived(Math.max(1, ...cells.map((c) => c.subjects)));

  function colorFor(n: number, m: number): string {
    if (n === 0) return 'var(--heatmap-0)';
    const intensity = n / m;
    if (intensity < 0.25) return 'var(--heatmap-1)';
    if (intensity < 0.5) return 'var(--heatmap-2)';
    if (intensity < 0.75) return 'var(--heatmap-3)';
    return 'var(--heatmap-4)';
  }

  const width = $derived(LABEL_W + weeks * (CELL + GAP));
  const height = LABEL_H + 7 * (CELL + GAP);

  const monthLabels = $derived.by(() => {
    const labels: { x: number; label: string }[] = [];
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    let lastMonth = -1;
    for (let col = 0; col < weeks; col++) {
      const d = new Date(start);
      d.setDate(start.getDate() + col * 7);
      if (d.getMonth() !== lastMonth) {
        labels.push({ x: LABEL_W + col * (CELL + GAP), label: months[d.getMonth()] });
        lastMonth = d.getMonth();
      }
    }
    return labels;
  });

  const rowLabels = ['Lun', '', 'Mer', '', 'Ven', '', 'Dim'];

  function tooltip(c: Cell): string {
    const [y, m, dd] = c.date.split('-').map(Number);
    const d = new Date(y, m - 1, dd);
    const fmt = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return c.subjects > 0
      ? `${fmt} — ${c.subjects} sujet${c.subjects > 1 ? 's' : ''}`
      : `${fmt} — pas de digest`;
  }
</script>

<div class="heatmap-wrap">
  <svg
    viewBox="0 0 {width} {height}"
    role="img"
    aria-label="Carte d'activité des {weeks} dernières semaines"
    preserveAspectRatio="xMinYMin meet"
  >
    {#each monthLabels as ml}
      <text x={ml.x} y={LABEL_H - 4} class="axis">{ml.label}</text>
    {/each}
    {#each rowLabels as rl, i}
      {#if rl}
        <text x={LABEL_W - 6} y={LABEL_H + i * (CELL + GAP) + CELL - 2} text-anchor="end" class="axis">
          {rl}
        </text>
      {/if}
    {/each}
    {#each cells as c}
      <rect
        x={LABEL_W + c.col * (CELL + GAP)}
        y={LABEL_H + c.row * (CELL + GAP)}
        width={CELL}
        height={CELL}
        rx="2"
        fill={colorFor(c.subjects, max)}
        stroke="var(--border)"
        stroke-width="0.5"
      >
        <title>{tooltip(c)}</title>
      </rect>
    {/each}
  </svg>

  <div class="legend" aria-hidden="true">
    <span>Moins</span>
    <span class="sw" style="background: var(--heatmap-0)"></span>
    <span class="sw" style="background: var(--heatmap-1)"></span>
    <span class="sw" style="background: var(--heatmap-2)"></span>
    <span class="sw" style="background: var(--heatmap-3)"></span>
    <span class="sw" style="background: var(--heatmap-4)"></span>
    <span>Plus</span>
  </div>
</div>

<style>
  .heatmap-wrap {
    overflow-x: auto;
  }
  svg {
    display: block;
    min-width: 100%;
  }
  .axis {
    fill: var(--text-dim);
    font-size: 10px;
    font-family: var(--font-mono);
  }
  rect {
    cursor: default;
  }
  .legend {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 0.75rem;
    color: var(--text-dim);
    font-size: 0.75rem;
    justify-content: flex-end;
  }
  .sw {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border: 0.5px solid var(--border);
  }
</style>
