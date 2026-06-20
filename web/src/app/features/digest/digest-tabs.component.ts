import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChildren
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DigestStore } from '../../core/digest-store.service';
import { PrefsService, type Depth } from '../../core/prefs.service';
import { MarkdownComponent } from '../../shared/markdown.component';
import { DetailSnippetComponent } from './detail-snippet.component';
import type { DetailSnippet, RenderedCategory, RenderedDigest } from '../../data/types';

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
  readonly prefs = inject(PrefsService);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  readonly tabList = computed<Tab[]>(() => this.digest().categories.map((c) => c.category));

  readonly activeTab = signal<Tab>('');

  /** The currently selected category object. */
  readonly activeCat = computed<RenderedCategory | undefined>(() =>
    this.digest().categories.find((c) => c.category === this.activeTab())
  );

  /** Per-tab per-snippet open state. */
  readonly snippetOpen = signal<Record<string, Record<string, boolean>>>({});

  constructor() {
    // (Re)initialize the active tab whenever we navigate between digests.
    effect(() => {
      const d = this.digest();
      this.activeTab.set(d.categories[0]?.category ?? '');
      this.snippetOpen.set({});
    });
  }

  // ---- depth (Profondeur) -------------------------------------------------

  readonly depth = this.prefs.depth;

  setDepth(d: Depth): void {
    this.prefs.setDepth(d);
  }

  showDetail(): boolean {
    return this.depth() === 'det';
  }

  // ---- category resolution ------------------------------------------------

  catFor(tab: Tab): RenderedCategory | undefined {
    return this.digest().categories.find((c) => c.category === tab);
  }

  hasDetail(cat: RenderedCategory | undefined): boolean {
    return !!cat?.detailHtml || (cat?.detailSnippets?.length ?? 0) > 0;
  }

  /** Subjects of the active category (empty when the category falls back to raw HTML). */
  activeSnippets(): DetailSnippet[] {
    return this.activeCat()?.detailSnippets ?? [];
  }

  isCatHigh(cat: RenderedCategory | undefined): boolean {
    return cat?.importance === 'high';
  }

  tabLabel(tab: Tab): string {
    return this.store.labelFor(tab);
  }

  subjectCount(cat: RenderedCategory | undefined): number {
    return cat?.detailSnippets?.length ?? 0;
  }

  tabId(tab: Tab): string {
    return `tab-${tab}`;
  }

  panelId(tab: Tab): string {
    return `panel-${tab}`;
  }

  sectionId(index: string): string {
    return `subj-${index}`;
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

  // ---- subject (snippet) open state ---------------------------------------

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

  /** True when every subject of the active category is expanded. */
  allOpen(): boolean {
    const snippets = this.activeSnippets();
    if (snippets.length === 0) return false;
    const tab = this.activeTab();
    return snippets.every((s) => this.isSnippetOpen(tab, s.index));
  }

  toggleAll(): void {
    this.setAllSnippets(this.activeTab(), this.activeCat(), !this.allOpen());
  }

  // ---- TOC jump -----------------------------------------------------------

  /** Expand the subject and smooth-scroll to it (offset compensated by scroll-margin). */
  jumpTo(index: string): void {
    this.setSnippetOpen(this.activeTab(), index, true);
    if (!this.isBrowser) return;
    // Defer so the <details> has opened before we scroll.
    queueMicrotask(() => {
      const el = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(
        `#${CSS.escape(this.sectionId(index))}`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
