import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
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
      [open]="open()"
      (toggle)="open.set($any($event.currentTarget).open)"
    >
      <summary class="snippet-head">
        <span class="snippet-index" aria-hidden="true">{{ snippet().index }}</span>
        <span class="snippet-title-wrap">
          <span class="snippet-title">{{ snippet().title }}</span>
          @if (snippet().preview && !open()) {
            <span class="snippet-preview">{{ snippet().preview }}</span>
          }
        </span>
        <span class="snippet-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path
              d="M5 3l5 5-5 5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </summary>

      @if (snippet().source || snippet().date) {
        <div class="snippet-meta">
          @if (snippet().source) {
            <span class="meta-chip meta-source">
              <span class="meta-label">Source</span>
              @if (snippet().sourceUrl) {
                <a [href]="snippet().sourceUrl" target="_blank" rel="noopener noreferrer">{{
                  snippet().source
                }}</a>
              } @else {
                <span>{{ snippet().source }}</span>
              }
            </span>
          }
          @if (snippet().date) {
            <span class="meta-chip meta-date">
              <span class="meta-label">Date</span>
              <span>{{ snippet().date }}</span>
            </span>
          }
        </div>
      }

      <app-markdown class="snippet-body" [snippetBody]="true" [html]="snippet().bodyHtml" />
    </details>
  `,
  styleUrl: './detail-snippet.component.css'
})
export class DetailSnippetComponent {
  readonly snippet = input.required<DetailSnippet>();
  readonly open = model<boolean>(false);
}
