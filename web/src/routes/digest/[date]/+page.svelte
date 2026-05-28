<script lang="ts">
  import { base } from '$app/paths';
  import { seen } from '$lib/seen.svelte';
  import type { DetailSnippet } from '$lib/markdown';

  interface RenderedCategory {
    category: string;
    syntheseHtml?: string;
    detailHtml?: string;
    detailSnippets?: DetailSnippet[];
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
  const tabList = $derived<Tab[]>([
    ...(data.recapHtml ? (['recap'] as Tab[]) : []),
    ...data.categories.map((c: RenderedCategory) => c.category)
  ]);

  let activeTab = $state<Tab>('');
  // (Re)initialize active tab when navigating between digests
  $effect(() => {
    activeTab = data.recapHtml ? 'recap' : data.categories[0]?.category ?? '';
  });
  const detailOpen = $state<Record<string, boolean>>({});
  const snippetOpen = $state<Record<string, Record<string, boolean>>>({});

  function setAllSnippets(tab: string, snippets: DetailSnippet[] | undefined, open: boolean) {
    if (!snippets) return;
    const next: Record<string, boolean> = {};
    for (const s of snippets) next[s.index] = open;
    snippetOpen[tab] = next;
  }

  let tabRefs: HTMLButtonElement[] = $state([]);

  function onTabKeydown(e: KeyboardEvent, idx: number) {
    const last = tabList.length - 1;
    let next = idx;
    switch (e.key) {
      case 'ArrowRight':
        next = idx === last ? 0 : idx + 1;
        break;
      case 'ArrowLeft':
        next = idx === 0 ? last : idx - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    activeTab = tabList[next];
    tabRefs[next]?.focus();
  }

  // Mark this digest as seen when the user opens it
  $effect(() => {
    seen.acknowledge(data.date);
  });

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

  function panelId(tab: Tab): string {
    return `panel-${tab}`;
  }
  function tabId(tab: Tab): string {
    return `tab-${tab}`;
  }
</script>

<svelte:head>
  <title>Veille — {formatDate(data.date)}</title>
</svelte:head>

<nav class="breadcrumb" aria-label="Fil d'Ariane">
  <a href="{base}/">← Tous les digests</a>
</nav>

<header class="day-head">
  <h1>{data.recapTitle ?? formatDate(data.date)}</h1>
  <p class="day-meta">{formatDate(data.date)}</p>
</header>

<div class="tabs" role="tablist" aria-label="Sections du digest">
  {#each tabList as tab, i (tab)}
    {@const active = activeTab === tab}
    <button
      bind:this={tabRefs[i]}
      role="tab"
      id={tabId(tab)}
      aria-selected={active}
      aria-controls={panelId(tab)}
      tabindex={active ? 0 : -1}
      class="tab"
      class:active
      onclick={() => (activeTab = tab)}
      onkeydown={(e) => onTabKeydown(e, i)}
    >
      {tab === 'recap' ? 'Recap global' : tab}
    </button>
  {/each}
</div>

{#each tabList as tab (tab)}
  {@const isRecap = tab === 'recap'}
  {@const cat = data.categories.find((c: RenderedCategory) => c.category === tab)}
  {@const hasDetail = !isRecap && (!!cat?.detailHtml || (cat?.detailSnippets?.length ?? 0) > 0)}
  {@const hasBoth = !isRecap && !!cat?.syntheseHtml && hasDetail}
  {@const showDetail = !isRecap && (detailOpen[tab] ?? false)}

  <div
    role="tabpanel"
    id={panelId(tab)}
    aria-labelledby={tabId(tab)}
    tabindex="0"
    hidden={activeTab !== tab}
    class="panel"
  >
    {#if isRecap && data.recapHtml}
      <div class="markdown">
        {@html data.recapHtml}
      </div>
    {:else if cat}
      {#if hasBoth}
        <div class="view-toggle" role="radiogroup" aria-label="Profondeur de lecture">
          <button
            role="radio"
            aria-checked={!showDetail}
            class="seg"
            class:active={!showDetail}
            onclick={() => (detailOpen[tab] = false)}
          >
            Synthèse
          </button>
          <button
            role="radio"
            aria-checked={showDetail}
            class="seg"
            class:active={showDetail}
            onclick={() => (detailOpen[tab] = true)}
          >
            Analyse détaillée
          </button>
        </div>
      {/if}

      {#if showDetail && cat.detailSnippets && cat.detailSnippets.length > 0}
        <div class="snippet-controls" role="group" aria-label="Affichage des sujets">
          <span class="snippet-count">{cat.detailSnippets.length} sujet{cat.detailSnippets.length > 1 ? 's' : ''}</span>
          <div class="snippet-actions">
            <button
              type="button"
              class="snippet-action"
              onclick={() => setAllSnippets(tab, cat.detailSnippets, true)}
            >Tout déplier</button>
            <button
              type="button"
              class="snippet-action"
              onclick={() => setAllSnippets(tab, cat.detailSnippets, false)}
            >Tout replier</button>
          </div>
        </div>
        <ul class="snippets" aria-label="Sujets détaillés">
          {#each cat.detailSnippets as snip (snip.index)}
            {@const open = snippetOpen[tab]?.[snip.index] ?? false}
            <li>
              <details
                class="snippet"
                class:is-open={open}
                {open}
                ontoggle={(e) => {
                  if (!snippetOpen[tab]) snippetOpen[tab] = {};
                  snippetOpen[tab][snip.index] = (e.currentTarget as HTMLDetailsElement).open;
                }}
              >
                <summary class="snippet-head">
                  <span class="snippet-index" aria-hidden="true">{snip.index}</span>
                  <span class="snippet-title-wrap">
                    <span class="snippet-title">{snip.title}</span>
                    {#if snip.preview && !open}
                      <span class="snippet-preview">{snip.preview}</span>
                    {/if}
                  </span>
                  <span class="snippet-chevron" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="14" height="14"><path d="M5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </span>
                </summary>
                {#if snip.source || snip.date}
                  <div class="snippet-meta">
                    {#if snip.source}
                      <span class="meta-chip meta-source">
                        <span class="meta-label">Source</span>
                        {#if snip.sourceUrl}
                          <a href={snip.sourceUrl} target="_blank" rel="noopener noreferrer">{snip.source}</a>
                        {:else}
                          <span>{snip.source}</span>
                        {/if}
                      </span>
                    {/if}
                    {#if snip.date}
                      <span class="meta-chip meta-date">
                        <span class="meta-label">Date</span>
                        <span>{snip.date}</span>
                      </span>
                    {/if}
                  </div>
                {/if}
                <div class="markdown snippet-body">
                  {@html snip.bodyHtml}
                </div>
              </details>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="markdown">
          {#if showDetail && cat.detailHtml}
            {@html cat.detailHtml}
          {:else if cat.syntheseHtml}
            {@html cat.syntheseHtml}
          {:else if cat.detailHtml}
            {@html cat.detailHtml}
          {:else}
            <p class="empty">Aucun contenu pour cette catégorie.</p>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
{/each}

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
  .breadcrumb a:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 2px;
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
  .tab:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    border-radius: 2px;
  }

  .panel {
    padding: 2rem 0 1rem;
  }
  .panel:focus {
    outline: none;
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
  .seg:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .empty {
    color: var(--text-dim);
    font-style: italic;
  }

  .snippet-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 1.25rem 0 0.85rem;
    flex-wrap: wrap;
  }
  .snippet-count {
    font-size: 0.82rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-variant-numeric: tabular-nums;
  }
  .snippet-actions {
    display: inline-flex;
    gap: 0.35rem;
  }
  .snippet-action {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    font: inherit;
    font-size: 0.8rem;
    padding: 0.3rem 0.7rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }
  .snippet-action:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .snippet-action:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .snippets {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .snippet {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    overflow: hidden;
  }
  .snippet:hover {
    border-color: var(--border-strong);
  }
  .snippet.is-open {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent-soft);
  }

  .snippet-head {
    display: flex;
    align-items: flex-start;
    gap: 0.9rem;
    padding: 0.95rem 1.15rem;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }
  .snippet-head::-webkit-details-marker {
    display: none;
  }
  .snippet-head:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    border-radius: var(--radius);
  }

  .snippet-index {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-soft);
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    min-width: 1.9rem;
    text-align: center;
    line-height: 1.4;
    margin-top: 0.1rem;
  }

  .snippet-title-wrap {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .snippet-title {
    font-weight: 600;
    color: var(--text);
    line-height: 1.4;
    font-size: 1rem;
  }
  .snippet-preview {
    color: var(--text-dim);
    font-size: 0.85rem;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .snippet-chevron {
    flex-shrink: 0;
    color: var(--text-dim);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 0.2rem;
    transition: transform 0.2s ease, color 0.15s ease;
  }
  .snippet.is-open .snippet-chevron {
    transform: rotate(90deg);
    color: var(--accent);
  }

  .snippet-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem 0.6rem;
    padding: 0 1.15rem 0.5rem;
    margin-top: -0.2rem;
  }
  .meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--bg-soft);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.18rem 0.6rem 0.18rem 0.5rem;
    font-size: 0.78rem;
    color: var(--text-muted);
    max-width: 100%;
  }
  .meta-label {
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.66rem;
    font-weight: 600;
  }
  .meta-source a {
    color: var(--text);
    border-bottom: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 24ch;
  }
  .meta-source a:hover {
    color: var(--accent);
  }

  .snippet-body {
    padding: 0.4rem 1.15rem 1.25rem;
    border-top: 1px solid var(--border);
    margin-top: 0.2rem;
  }
  .snippet-body :global(h3:first-child),
  .snippet-body :global(h4:first-child) {
    margin-top: 0.8rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .snippet-chevron,
    .snippet,
    .snippet-action {
      transition: none;
    }
  }
</style>
