<script lang="ts">
  import Heatmap from '$lib/components/Heatmap.svelte';
  import BarChart from '$lib/components/BarChart.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import type { OverallStats } from '$lib/digests';

  let { data } = $props<{ data: { stats: OverallStats } }>();
  const s = $derived(data.stats);

  function fmtDate(iso: string | null): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  const avgSubjects = $derived(
    s.totalDigests ? (s.totalSubjects / s.totalDigests).toFixed(1) : '0'
  );

  const categoryBars = $derived(
    s.categories.map((c) => ({
      label: c.category,
      value: c.totalSubjects,
      sub: `${c.daysCovered} jour${c.daysCovered > 1 ? 's' : ''} couvert${c.daysCovered > 1 ? 's' : ''} · ${c.totalSources} source${c.totalSources > 1 ? 's' : ''}`
    }))
  );

  const sourceBars = $derived(
    s.categories.map((c) => ({
      label: c.category,
      value: c.totalSources
    }))
  );
</script>

<svelte:head>
  <title>Veille — Statistiques</title>
</svelte:head>

<header class="page-head">
  <h1>Statistiques</h1>
  <p class="sub">Vue agrégée sur l'ensemble du corpus de digests.</p>
</header>

<section aria-labelledby="kpi-heading">
  <h2 id="kpi-heading" class="visually-hidden">Indicateurs clés</h2>
  <dl class="kpis">
    <div>
      <dt>Digests</dt>
      <dd>{s.totalDigests}</dd>
    </div>
    <div>
      <dt>Sujets analysés</dt>
      <dd>{s.totalSubjects}</dd>
    </div>
    <div>
      <dt>Sources citées</dt>
      <dd>{s.totalSources}</dd>
    </div>
    <div>
      <dt>Sujets / digest</dt>
      <dd>{avgSubjects}</dd>
    </div>
    <div>
      <dt>Période</dt>
      <dd class="period">{fmtDate(s.firstDate)} → {fmtDate(s.lastDate)}</dd>
    </div>
  </dl>
</section>

<section class="block" aria-labelledby="heatmap-heading">
  <header class="block-head">
    <h2 id="heatmap-heading">Activité quotidienne</h2>
    <p>Intensité = nombre de sujets analysés par jour, sur les 26 dernières semaines.</p>
  </header>
  <Heatmap activity={s.timeline} weeks={26} />
</section>

<section class="block" aria-labelledby="timeline-heading">
  <header class="block-head">
    <h2 id="timeline-heading">Évolution des sujets par digest</h2>
    <p>Volume de sujets traités, dans l'ordre chronologique.</p>
  </header>
  <LineChart data={s.timeline} />
</section>

<div class="two-col">
  <section class="block" aria-labelledby="cat-heading">
    <header class="block-head">
      <h2 id="cat-heading">Sujets par catégorie</h2>
      <p>Cumul sur toute la période.</p>
    </header>
    {#if s.categories.length === 0}
      <p class="empty">Pas encore assez de données.</p>
    {:else}
      <BarChart data={categoryBars} unit="sujets" />
    {/if}
  </section>

  <section class="block" aria-labelledby="src-heading">
    <header class="block-head">
      <h2 id="src-heading">Sources par catégorie</h2>
      <p>Indicateur de la diversité des références citées.</p>
    </header>
    {#if s.categories.length === 0}
      <p class="empty">Pas encore assez de données.</p>
    {:else}
      <BarChart data={sourceBars} unit="sources" />
    {/if}
  </section>
</div>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .page-head {
    margin-bottom: 2rem;
  }
  .page-head h1 {
    margin: 0 0 0.4rem;
    font-size: 2rem;
    letter-spacing: -0.02em;
  }
  .sub {
    margin: 0;
    color: var(--text-muted);
  }

  .kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
    margin: 0 0 2.5rem;
    padding: 0;
  }
  .kpis > div {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.85rem 1rem;
  }
  .kpis dt {
    color: var(--text-dim);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 0.25rem;
  }
  .kpis dd {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .kpis dd.period {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .block {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .block-head {
    margin-bottom: 1.25rem;
  }
  .block-head h2 {
    margin: 0 0 0.25rem;
    font-size: 1.1rem;
  }
  .block-head p {
    margin: 0;
    color: var(--text-dim);
    font-size: 0.88rem;
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  @media (max-width: 720px) {
    .two-col {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }

  .empty {
    color: var(--text-dim);
    text-align: center;
    padding: 2rem 0;
  }
</style>
