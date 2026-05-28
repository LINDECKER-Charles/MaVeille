<script lang="ts">
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import type { DigestMeta, SearchHit } from '$lib/types';
  import { search } from '$lib/digests';
  import { seen } from '$lib/seen.svelte';

  let { data } = $props<{
    data: {
      digests: DigestMeta[];
      totals: { digests: number; subjects: number; sources: number };
    };
  }>();

  // Bind query to ?q= URL param for shareable searches — client-only because we prerender
  let query = $state('');
  let queryInput: HTMLInputElement | undefined;

  $effect(() => {
    if (!browser) return;
    const initial = new URL(window.location.href).searchParams.get('q') ?? '';
    if (initial) query = initial;
  });

  function syncUrl(q: string) {
    if (!browser) return;
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url.pathname + url.search);
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  function onInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    query = v;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => syncUrl(v.trim()), 200);
  }

  function clearQuery() {
    query = '';
    syncUrl('');
    queryInput?.focus();
  }

  // Keyboard shortcut: "/" focuses the search field
  function onKeydown(e: KeyboardEvent) {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
      e.preventDefault();
      queryInput?.focus();
    }
  }

  // Derived: search results when querying, otherwise just the digest list
  const hits = $derived<SearchHit[]>(query.trim().length >= 2 ? search(query) : []);
  const isSearching = $derived(query.trim().length >= 2);
  const newCount = $derived(seen.countNew(data.digests.map((d: DigestMeta) => d.date)));

  const fmt = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  function formatDate(iso: string): string {
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

  function typeLabel(t: SearchHit['type']): string {
    return t === 'recap' ? 'Recap' : t === 'synthese' ? 'Synthèse' : 'Détail';
  }
</script>

<svelte:head>
  <title>Veille — Digests quotidiens</title>
  <meta
    name="description"
    content="Veille tech quotidienne — {data.totals.digests} digests, {data.totals.subjects} sujets analysés."
  />
</svelte:head>

<svelte:window on:keydown={onKeydown} />

<section class="hero">
  <h1>Digests quotidiens</h1>
  <p class="hero-sub">
    Veille tech automatisée, générée chaque matin par Claude.
  </p>

  <dl class="kpis" aria-label="Statistiques globales">
    <div>
      <dt>Digests</dt>
      <dd>{data.totals.digests}</dd>
    </div>
    <div>
      <dt>Sujets analysés</dt>
      <dd>{data.totals.subjects}</dd>
    </div>
    <div>
      <dt>Sources citées</dt>
      <dd>{data.totals.sources}</dd>
    </div>
    {#if newCount > 0}
      <div class="kpi-new">
        <dt>Nouveau</dt>
        <dd>+{newCount}</dd>
      </div>
    {/if}
  </dl>
</section>

<form class="search" role="search" aria-label="Recherche dans les digests" onsubmit={(e) => e.preventDefault()}>
  <label for="search-input" class="visually-hidden">Rechercher dans les digests</label>
  <div class="search-field">
    <svg class="search-icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M14 14l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
    <input
      id="search-input"
      bind:this={queryInput}
      type="search"
      placeholder="Rechercher (raccourci : /)"
      value={query}
      oninput={onInput}
      aria-describedby="search-help"
      aria-controls="results-list"
      autocomplete="off"
      spellcheck="false"
    />
    {#if query}
      <button
        type="button"
        class="search-clear"
        onclick={clearQuery}
        aria-label="Effacer la recherche"
      >×</button>
    {/if}
  </div>
  <p id="search-help" class="search-help">
    {#if isSearching}
      <span aria-live="polite">{hits.length} résultat{hits.length > 1 ? 's' : ''} pour « {query} »</span>
    {:else}
      Tape au moins 2 caractères pour chercher dans les recaps, synthèses et analyses détaillées.
    {/if}
  </p>
</form>

{#if isSearching}
  <ul id="results-list" class="results" aria-label="Résultats de recherche">
    {#if hits.length === 0}
      <li class="empty">Aucun résultat. Essaie un autre mot-clé.</li>
    {:else}
      {#each hits as h (h.date + h.scope + h.type)}
        <li>
          <a class="result" href="{base}/digest/{h.date}/">
            <div class="result-head">
              <span class="result-date">{formatDate(h.date)}</span>
              <span class="result-tags">
                <span class="badge">{h.scope === 'recap' ? 'Recap' : h.scope}</span>
                <span class="badge badge-soft">{typeLabel(h.type)}</span>
                {#if h.score > 1}
                  <span class="badge badge-soft">{h.score} matchs</span>
                {/if}
              </span>
            </div>
            <p class="result-snippet">{@html h.snippet}</p>
          </a>
        </li>
      {/each}
    {/if}
  </ul>
{:else if data.digests.length === 0}
  <p class="empty">Aucun digest disponible pour le moment.</p>
{:else}
  <ul id="results-list" class="digests" aria-label="Liste des digests">
    {#each data.digests as d (d.date)}
      {@const isNew = seen.isNew(d.date)}
      <li>
        <a
          href="{base}/digest/{d.date}/"
          class="card"
          class:is-new={isNew}
          aria-label="Digest du {formatDate(d.date)}{isNew ? ', nouveau' : ''}"
        >
          <div class="card-head">
            <span class="date">
              {formatDate(d.date)}
              {#if isNew}
                <span class="new-dot" aria-hidden="true" title="Nouveau"></span>
              {/if}
            </span>
            <span class="rel">{relativeDay(d.date)}</span>
          </div>
          <div class="card-meta">
            {#if d.hasRecap}
              <span class="badge badge-accent">Recap</span>
            {/if}
            {#each d.categories as cat}
              <span class="badge">{cat}</span>
            {/each}
            {#if d.totalSubjects > 0}
              <span class="badge badge-count" title="{d.totalSubjects} sujets, {d.totalSources} sources">
                {d.totalSubjects} sujet{d.totalSubjects > 1 ? 's' : ''}
              </span>
            {/if}
          </div>
        </a>
      </li>
    {/each}
  </ul>
{/if}

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

  .hero {
    margin-bottom: 1.5rem;
  }
  .hero h1 {
    margin: 0 0 0.4rem;
    font-size: 2rem;
    letter-spacing: -0.02em;
  }
  .hero-sub {
    margin: 0 0 1.5rem;
    color: var(--text-muted);
  }

  .kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
    margin: 0;
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
    color: var(--text);
  }
  .kpi-new {
    background: var(--accent-soft) !important;
    border-color: transparent !important;
  }
  .kpi-new dt,
  .kpi-new dd {
    color: var(--accent) !important;
  }

  .search {
    margin: 2rem 0 1rem;
  }
  .search-field {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 14px;
    width: 18px;
    height: 18px;
    color: var(--text-dim);
    pointer-events: none;
  }
  .search input {
    flex: 1;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text);
    font: inherit;
    padding: 0.7rem 2.4rem;
    border-radius: var(--radius);
    width: 100%;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .search input::-webkit-search-cancel-button {
    display: none;
  }
  .search input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .search input::placeholder {
    color: var(--text-dim);
  }
  .search-clear {
    position: absolute;
    right: 8px;
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 1.4rem;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .search-clear:hover,
  .search-clear:focus-visible {
    color: var(--text);
    background: var(--bg-soft);
  }
  .search-help {
    margin: 0.5rem 2px 0;
    font-size: 0.8rem;
    color: var(--text-dim);
  }

  .empty {
    color: var(--text-dim);
    padding: 3rem 0;
    text-align: center;
  }

  .digests,
  .results {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .card,
  .result {
    display: block;
    padding: 1rem 1.25rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    border-bottom: 1px solid var(--border);
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .card:hover,
  .result:hover,
  .card:focus-visible,
  .result:focus-visible {
    border-color: var(--accent);
    transform: translateY(-1px);
    outline: none;
  }
  .card:focus-visible,
  .result:focus-visible {
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .card.is-new {
    border-left: 3px solid var(--accent);
    padding-left: calc(1.25rem - 3px + 1px);
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
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .new-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }
  .rel {
    color: var(--text-dim);
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }

  .card-meta,
  .result-tags {
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
    white-space: nowrap;
  }
  .badge-accent {
    background: var(--accent-soft);
    color: var(--accent);
    border-color: transparent;
  }
  .badge-soft {
    text-transform: none;
    letter-spacing: 0;
  }
  .badge-count {
    text-transform: none;
    letter-spacing: 0;
    color: var(--text-dim);
  }

  .result-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }
  .result-date {
    font-weight: 600;
    text-transform: capitalize;
  }
  .result-snippet {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.55;
  }
  .result-snippet :global(mark) {
    background: var(--accent-soft);
    color: var(--accent);
    padding: 0 2px;
    border-radius: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .result {
      transition: none !important;
    }
    .card:hover,
    .result:hover,
    .card:focus-visible,
    .result:focus-visible {
      transform: none;
    }
  }
</style>
