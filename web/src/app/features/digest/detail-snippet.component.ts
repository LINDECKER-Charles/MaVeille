import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { MarkdownComponent } from '../../shared/markdown.component';
import type { DetailSnippet } from '../../data/types';

@Component({
  selector: 'app-detail-snippet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  template: `
    <details
      class="snippet"
      [class.is-open]="open()"
      [style.--cat-accent]="accent()"
      [open]="open()"
      (toggle)="open.set($any($event.currentTarget).open)"
    >
      <summary class="snippet-head">
        <span class="snippet-index" aria-hidden="true">{{ snippet().index }}</span>
        <span class="snippet-main">
          <span class="snippet-title-row">
            <span class="snippet-title">{{ snippet().title }}</span>
            @if (high()) {
              <span class="badge-high">HIGH IMPACT</span>
            }
          </span>
          <span class="snippet-meta">
            @if (domain()) {
              <span class="chip-source">
                <span class="chip-dot" aria-hidden="true"></span>
                {{ domain() }}
              </span>
            }
            @if (snippet().date) {
              <span class="meta-date">{{ snippet().date }}</span>
            }
            <span class="meta-rt">· {{ snippet().readingMinutes }} min de lecture</span>
          </span>
          @if (snippet().preview && !open()) {
            <span class="snippet-preview">{{ snippet().preview }}</span>
          }
        </span>
        <span class="snippet-caret" aria-hidden="true">▾</span>
      </summary>

      <div class="snippet-body-wrap">
        <app-markdown class="snippet-body" [snippetBody]="true" [html]="snippet().bodyHtml" />
        @if (snippet().sourceUrl) {
          <a
            class="source-link"
            [href]="snippet().sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source : {{ domain() || snippet().source }} ↗
          </a>
        }
      </div>
    </details>
  `,
  styleUrl: './detail-snippet.component.css'
})
export class DetailSnippetComponent {
  readonly snippet = input.required<DetailSnippet>();
  readonly open = model<boolean>(false);
  /** Whether the parent category is flagged high importance (badge). */
  readonly high = input<boolean>(false);
  /** Category accent (CSS color string from DigestStore.accentFor). */
  readonly accent = input<string>('var(--brand)');

  /** Hostname extracted from sourceUrl, falling back to a cleaned `source` string. */
  readonly domain = computed<string>(() => {
    const s = this.snippet();
    const raw = s.sourceUrl ?? s.source;
    if (!raw) return '';
    try {
      const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
  });
}
