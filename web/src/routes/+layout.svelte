<script lang="ts">
  import '../app.css';
  import { base } from '$app/paths';

  let { children } = $props();

  let theme = $state<'dark' | 'light'>('dark');

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('veille-theme', theme);
    }
  }

  $effect(() => {
    const saved = localStorage.getItem('veille-theme');
    if (saved === 'light' || saved === 'dark') {
      theme = saved;
      document.documentElement.setAttribute('data-theme', saved);
    }
  });
</script>

<div class="shell">
  <header>
    <div class="header-inner">
      <a href="{base}/" class="brand">
        <span class="dot"></span>
        <span class="brand-text">Veille</span>
        <span class="brand-sub">tech digests</span>
      </a>
      <button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? '☾' : '☀'}
      </button>
    </div>
  </header>

  <main>
    {@render children?.()}
  </main>

  <footer>
    <span>
      Généré quotidiennement via Claude Cowork —
      <a href="https://github.com" rel="noopener noreferrer">source</a>
    </span>
  </footer>
</div>

<style>
  .shell {
    max-width: 920px;
    margin: 0 auto;
    padding: 0 1.5rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(12px);
    background: color-mix(in srgb, var(--bg) 75%, transparent);
    border-bottom: 1px solid var(--border);
    margin: 0 -1.5rem 2rem;
    padding: 0 1.5rem;
  }

  .header-inner {
    max-width: 920px;
    margin: 0 auto;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    color: var(--text);
    border-bottom: none;
    font-weight: 600;
    font-size: 1rem;
    letter-spacing: -0.01em;
  }
  .brand:hover {
    color: var(--accent);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    align-self: center;
    box-shadow: 0 0 12px var(--accent);
  }

  .brand-sub {
    color: var(--text-dim);
    font-size: 0.8rem;
    font-weight: 400;
    letter-spacing: 0;
  }

  .theme-toggle {
    background: var(--bg-soft);
    border: 1px solid var(--border);
    color: var(--text-muted);
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .theme-toggle:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  main {
    flex: 1;
  }

  footer {
    margin-top: 4rem;
    padding: 1.5rem 0;
    border-top: 1px solid var(--border);
    color: var(--text-dim);
    font-size: 0.85rem;
    text-align: center;
  }
</style>
