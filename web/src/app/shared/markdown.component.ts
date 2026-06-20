import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ThemeService } from '../core/theme.service';

/**
 * Renders pre-sanitized HTML (sanitized at build time by the generator).
 * Adds the `.markdown` class so global typography styles apply.
 *
 * Mermaid: the generator emits ```mermaid blocks as `<pre class="mermaid">`
 * markers carrying the raw source. This component lazily imports `mermaid`
 * (own chunk — diagram-less pages never load it), renders them client-side,
 * and re-renders on theme change. During prerender (Node) it no-ops; the
 * marker stays in the HTML and hydrates on the client.
 */
@Component({
  selector: 'app-markdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="markdown" [class.snippet-body]="snippetBody()" [innerHTML]="safe()"></div>`
})
export class MarkdownComponent {
  readonly html = input<string | undefined>('');
  readonly snippetBody = input<boolean>(false);

  private readonly sanitizer = inject(DomSanitizer);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly theme = inject(ThemeService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly safe = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.html() ?? '')
  );

  constructor() {
    // Re-run whenever the rendered HTML or the theme changes. Both are signals;
    // reading them here registers the effect's dependencies.
    effect(() => {
      this.html();
      const theme = this.theme.theme();
      if (!this.isBrowser) return;
      // Defer to the next microtask so Angular has flushed [innerHTML].
      queueMicrotask(() => this.renderMermaid(theme));
    });
  }

  private async renderMermaid(theme: 'dark' | 'light'): Promise<void> {
    const root = this.host.nativeElement as HTMLElement;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('pre.mermaid'));
    if (nodes.length === 0) return;

    for (const node of nodes) {
      // Capture the original source once so re-renders (theme changes, after
      // Mermaid has replaced the contents with an <svg>) still have it.
      if (node.dataset['src'] === undefined) {
        node.dataset['src'] = node.textContent ?? '';
      }
      // Reset to source + clear the processed flag so mermaid.run re-renders.
      node.textContent = node.dataset['src'];
      node.removeAttribute('data-processed');
    }

    try {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: theme === 'dark' ? 'dark' : 'default'
      });
      await mermaid.run({ nodes });
    } catch {
      // Parse/load failure: leave the raw source visible, don't crash the page.
    }
  }
}
