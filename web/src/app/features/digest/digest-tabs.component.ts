import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChildren
} from '@angular/core';
import { DigestStore } from '../../core/digest-store.service';
import { MarkdownComponent } from '../../shared/markdown.component';
import { DetailSnippetComponent } from './detail-snippet.component';
import type { RenderedCategory, RenderedDigest } from '../../data/types';

type Tab = string; // <category>

@Component({
  selector: 'app-digest-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent, DetailSnippetComponent],
  templateUrl: './digest-tabs.component.html',
  styleUrl: './digest-tabs.component.css'
})
export class DigestTabsComponent {
  readonly digest = input.required<RenderedDigest>();
  readonly store = inject(DigestStore);

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  readonly tabList = computed<Tab[]>(() => this.digest().categories.map((c) => c.category));

  readonly activeTab = signal<Tab>('');
  /** Per-tab synthèse/détail toggle state (true = détail). */
  private readonly detailOpen = signal<Record<string, boolean>>({});
  /** Per-tab per-snippet open state. */
  readonly snippetOpen = signal<Record<string, Record<string, boolean>>>({});

  constructor() {
    // (Re)initialize the active tab whenever we navigate between digests.
    effect(() => {
      const d = this.digest();
      this.activeTab.set(d.categories[0]?.category ?? '');
      this.detailOpen.set({});
      this.snippetOpen.set({});
    });
  }

  catFor(tab: Tab): RenderedCategory | undefined {
    return this.digest().categories.find((c) => c.category === tab);
  }

  hasDetail(cat: RenderedCategory | undefined): boolean {
    return !!cat?.detailHtml || (cat?.detailSnippets?.length ?? 0) > 0;
  }

  hasBoth(cat: RenderedCategory | undefined): boolean {
    return !!cat?.syntheseHtml && this.hasDetail(cat);
  }

  showDetail(tab: Tab): boolean {
    return this.detailOpen()[tab] ?? false;
  }

  setDetail(tab: Tab, value: boolean): void {
    this.detailOpen.update((s) => ({ ...s, [tab]: value }));
  }

  tabLabel(tab: Tab): string {
    return this.store.labelFor(tab);
  }

  tabId(tab: Tab): string {
    return `tab-${tab}`;
  }

  panelId(tab: Tab): string {
    return `panel-${tab}`;
  }

  selectTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  onTabKeydown(e: KeyboardEvent, idx: number): void {
    const list = this.tabList();
    const last = list.length - 1;
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
    this.activeTab.set(list[next]);
    this.tabButtons()[next]?.nativeElement.focus();
  }

  isSnippetOpen(tab: Tab, index: string): boolean {
    return this.snippetOpen()[tab]?.[index] ?? false;
  }

  setSnippetOpen(tab: Tab, index: string, open: boolean): void {
    this.snippetOpen.update((s) => ({ ...s, [tab]: { ...(s[tab] ?? {}), [index]: open } }));
  }

  setAllSnippets(tab: Tab, cat: RenderedCategory | undefined, open: boolean): void {
    const snippets = cat?.detailSnippets;
    if (!snippets) return;
    const next: Record<string, boolean> = {};
    for (const s of snippets) next[s.index] = open;
    this.snippetOpen.update((m) => ({ ...m, [tab]: next }));
  }
}
