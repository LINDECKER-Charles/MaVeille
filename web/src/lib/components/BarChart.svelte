<script lang="ts">
  interface Series {
    label: string;
    value: number;
    sub?: string;
  }

  let { data, unit = '' }: { data: Series[]; unit?: string } = $props();

  const max = $derived(Math.max(1, ...data.map((d) => d.value)));
</script>

<ul class="bars" role="list">
  {#each data as d}
    {@const pct = Math.round((d.value / max) * 100)}
    <li>
      <div class="bar-head">
        <span class="bar-label">{d.label}</span>
        <span class="bar-val">{d.value}{unit ? ' ' + unit : ''}</span>
      </div>
      <div
        class="bar-track"
        role="progressbar"
        aria-valuenow={d.value}
        aria-valuemin="0"
        aria-valuemax={max}
        aria-label="{d.label} — {d.value}{unit ? ' ' + unit : ''}"
      >
        <div class="bar-fill" style="width: {pct}%"></div>
      </div>
      {#if d.sub}
        <p class="bar-sub">{d.sub}</p>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .bars {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .bar-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.3rem;
  }
  .bar-label {
    color: var(--text);
    font-weight: 500;
  }
  .bar-val {
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
  }
  .bar-track {
    background: var(--bg-soft);
    height: 10px;
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--success)));
    border-radius: inherit;
    transition: width 0.4s ease;
  }
  .bar-sub {
    margin: 0.25rem 0 0;
    color: var(--text-dim);
    font-size: 0.8rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .bar-fill {
      transition: none;
    }
  }
</style>
