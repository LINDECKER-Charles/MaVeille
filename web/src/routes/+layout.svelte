<script lang="ts">
  import '../app.css';
  import { base } from '$app/paths';
  import { page } from '$app/stores';

  let { children } = $props();

  let theme = $state<'dark' | 'light'>('dark');

  function applyTheme(t: 'dark' | 'light') {
    theme = t;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('veille-theme', t);
    }
  }

  function toggleTheme() {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }

  $effect(() => {
    const saved = localStorage.getItem('veille-theme');
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
    } else if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      applyTheme('light');
    }
  });

  const navLinks = [
    { href: '/', label: 'Digests' },
    { href: '/stats/', label: 'Stats' }
  ];

  function isActive(href: string): boolean {
    const path = $page.url.pathname;
    if (href === '/') return path === `${base}/` || path === '/';
    return path.startsWith(`${base}${href}`);
  }
</script>

<a href="#main" class="skip-link">Aller au contenu principal</a>

<div class="shell">
  <header>
    <div class="header-inner">
      <a href="{base}/" class="brand" aria-label="Veille — accueil">
        <span class="dot" aria-hidden="true"></span>
        <span class="brand-text">Veille</span>
        <span class="brand-sub">tech digests</span>
      </a>

      <nav class="primary-nav" aria-label="Navigation principale">
        {#each navLinks as link}
          <a
            href="{base}{link.href}"
            class="nav-link"
            class:active={isActive(link.href)}
            aria-current={isActive(link.href) ? 'page' : undefined}
          >
            {link.label}
          </a>
        {/each}
      </nav>

      <button
        class="theme-toggle"
        onclick={toggleTheme}
        aria-label="Passer en mode {theme === 'dark' ? 'clair' : 'sombre'}"
        title="Thème"
      >
        <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
      </button>
    </div>
  </header>

  <main id="main" tabindex="-1">
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
  .skip-link {
    position: absolute;
    top: -100px;
    left: 1rem;
    background: var(--accent);
    color: var(--bg);
    padding: 0.6rem 1rem;
    border-radius: var(--radius-sm);
    text-decoration: none;
    z-index: 100;
    border-bottom: none;
    font-weight: 600;
    transition: top 0.15s ease;
  }
  .skip-link:focus {
    top: 0.75rem;
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

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
    gap: 1.25rem;
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
  .brand:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
    border-radius: 2px;
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

  .primary-nav {
    display: flex;
    gap: 0.25rem;
    margin-left: 1.5rem;
  }
  .nav-link {
    color: var(--text-muted);
    padding: 0.45rem 0.85rem;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    border-bottom: none;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .nav-link:hover {
    color: var(--text);
    background: var(--bg-soft);
  }
  .nav-link.active {
    color: var(--accent);
    background: var(--accent-soft);
  }
  .nav-link:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
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
    margin-left: auto;
  }
  .theme-toggle:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .theme-toggle:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  main {
    flex: 1;
  }
  main:focus {
    outline: none;
  }

  footer {
    margin-top: 4rem;
    padding: 1.5rem 0;
    border-top: 1px solid var(--border);
    color: var(--text-dim);
    font-size: 0.85rem;
    text-align: center;
  }

  @media (max-width: 540px) {
    .brand-sub {
      display: none;
    }
    .header-inner {
      gap: 0.5rem;
    }
    .primary-nav {
      margin-left: 0.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skip-link {
      transition: none;
    }
  }
</style>
