<script lang="ts">
  import { base } from '$app/paths';

  interface RenderedCategory {
    category: string;
    syntheseHtml?: string;
    detailHtml?: string;
  }

  let { data } = $props<{
    data: {
      date: string;
      recapTitle: string | null;
      recapHtml?: string;
      categories: RenderedCategory[];
    };
  }>();

  type Tab = 'recap' | string;
  let activeTab = $state<Tab>(data.recapHtml ? 'recap' : data.categories[0]?.category);

  // Per-category toggle: show synthese (default) or detail
  const detailOpen = $state<Record<string, boolean>>({});

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
</script>

<svelte:head>
  <title>Veille — {formatDate(data.date)}</title>
</svelte:head>

<nav class="breadcrumb">
  <a href="{base}/">← Tous les digests</a>
</nav>

<header class="day-head">
  <h1>{data.recapTitle ?? formatDate(data.date)}</h1>
  <p class="day-meta">{formatDate(data.date)}</p>
</header>

<div class="tabs" role="tablist">
  {#if data.recapHtml}
    <button
      role="tab"
      class="tab"
      class:active={activeTab === 'recap'}
      onclick={() => (activeTab = 'recap')}
    >
      Recap global
    </button>
  {/if}
  {#each data.categories as c (c.category)}
    <button
      role="tab"
      class="tab"
      class:active={activeTab === c.category}
      onclick={() => (activeTab = c.category)}
    >
      {c.category}
    </button>
  {/each}
</div>

<article class="panel">
  {#if activeTab === 'recap' && data.recapHtml}
    <div class="markdown">
      {@html data.recapHtml}
    </div>
  {:else}
    {#each data.categories as c (c.category)}
      {#if activeTab === c.category}
        {@const hasBoth = c.syntheseHtml && c.detailHtml}
        {@const showDetail = detailOpen[c.category] ?? false}

        {#if hasBoth}
          <div class="view-toggle" role="tablist">
            <button
              role="tab"
              class="seg"
              class:active={!showDetail}
              onclick={() => (detailOpen[c.category] = false)}
            >
              Synthèse
            </button>
            <button
              role="tab"
              class="seg"
              class:active={showDetail}
              onclick={() => (detailOpen[c.category] = true)}
            >
              Analyse détaillée
            </button>
          </div>
        {/if}

        <div class="markdown">
          {#if showDetail && c.detailHtml}
            {@html c.detailHtml}
          {:else if c.syntheseHtml}
            {@html c.syntheseHtml}
          {:else if c.detailHtml}
            {@html c.detailHtml}
          {:else}
            <p class="empty">Aucun contenu pour cette catégorie.</p>
          {/if}
        </div>
      {/if}
    {/each}
  {/if}
</article>

<style>
  .breadcrumb {
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }
  .breadcrumb a {
    color: var(--text-dim);
    border-bottom: none;
  }
  .breadcrumb a:hover {
    color: var(--accent);
  }

  .day-head {
    margin-bottom: 2rem;
  }
  .day-head h1 {
    margin: 0 0 0.3rem;
    font-size: 1.8rem;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }
  .day-meta {
    margin: 0;
    color: var(--text-dim);
    font-size: 0.9rem;
    text-transform: capitalize;
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0;
    overflow-x: auto;
  }
  .tab {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0.7rem 1rem;
    cursor: pointer;
    font-size: 0.92rem;
    font-family: inherit;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
  }
  .tab:hover {
    color: var(--text);
  }
  .tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .panel {
    padding: 2rem 0 1rem;
  }

  .view-toggle {
    display: inline-flex;
    background: var(--bg-soft);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 3px;
    margin-bottom: 1.5rem;
  }
  .seg {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0.4rem 0.9rem;
    font-size: 0.85rem;
    font-family: inherit;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .seg:hover {
    color: var(--text);
  }
  .seg.active {
    background: var(--bg-elevated);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  .empty {
    color: var(--text-dim);
    font-style: italic;
  }
</style>
