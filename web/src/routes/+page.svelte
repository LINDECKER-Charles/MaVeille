<script lang="ts">
  import { base } from '$app/paths';
  import type { DigestMeta } from '$lib/types';

  let { data } = $props<{ data: { digests: DigestMeta[] } }>();

  const fmt = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  function formatDate(iso: string): string {
    // iso = YYYY-MM-DD ; build in local time to avoid TZ drift
    const [y, m, d] = iso.split('-').map(Number);
    return fmt.format(new Date(y, m - 1, d));
  }

  function relativeDay(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    const target = new Date(y, m - 1, d).getTime();
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const diff = Math.round((todayMid - target) / 86_400_000);
    if (diff === 0) return "aujourd'hui";
    if (diff === 1) return 'hier';
    if (diff < 7) return `il y a ${diff} j`;
    if (diff < 30) return `il y a ${Math.floor(diff / 7)} sem`;
    return `il y a ${Math.floor(diff / 30)} mois`;
  }
</script>

<svelte:head>
  <title>Veille — Digests quotidiens</title>
</svelte:head>

<section class="hero">
  <h1>Digests quotidiens</h1>
  <p>
    Veille tech automatisée, générée chaque matin par Claude.
    {data.digests.length} digest{data.digests.length > 1 ? 's' : ''} disponible{data.digests.length > 1 ? 's' : ''}.
  </p>
</section>

{#if data.digests.length === 0}
  <p class="empty">Aucun digest disponible pour le moment.</p>
{:else}
  <ul class="digests">
    {#each data.digests as d (d.date)}
      <li>
        <a href="{base}/digest/{d.date}/" class="card">
          <div class="card-head">
            <span class="date">{formatDate(d.date)}</span>
            <span class="rel">{relativeDay(d.date)}</span>
          </div>
          <div class="card-meta">
            {#if d.hasRecap}
              <span class="badge badge-accent">Recap</span>
            {/if}
            {#each d.categories as cat}
              <span class="badge">{cat}</span>
            {/each}
          </div>
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .hero {
    margin-bottom: 2.5rem;
  }
  .hero h1 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
    letter-spacing: -0.02em;
  }
  .hero p {
    margin: 0;
    color: var(--text-muted);
  }

  .empty {
    color: var(--text-dim);
    padding: 3rem 0;
    text-align: center;
  }

  .digests {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .card {
    display: block;
    padding: 1rem 1.25rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    border-bottom: 1px solid var(--border);
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .card:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  .card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.6rem;
  }
  .date {
    font-weight: 600;
    text-transform: capitalize;
  }
  .rel {
    color: var(--text-dim);
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }

  .card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .badge {
    font-size: 0.75rem;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    background: var(--bg-soft);
    color: var(--text-muted);
    border: 1px solid var(--border);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge-accent {
    background: var(--accent-soft);
    color: var(--accent);
    border-color: transparent;
  }
</style>
