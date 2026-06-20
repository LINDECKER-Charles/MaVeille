import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  output,
  signal,
  viewChild
} from '@angular/core';

/**
 * Search input with "/" focus shortcut, 200ms debounce and clear button.
 * Emits debounced query changes; the parent owns search execution + URL sync.
 */
@Component({
  selector: 'app-search-box',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      class="search"
      role="search"
      aria-label="Recherche dans les digests"
      (submit)="$event.preventDefault()"
    >
      <label for="search-input" class="visually-hidden">Rechercher dans les digests</label>
      <div class="search-field">
        <svg class="search-icon" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.5" />
          <path d="M14 14l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <input
          #input
          id="search-input"
          type="search"
          placeholder="Rechercher (raccourci : /)"
          [value]="value()"
          (input)="onInput($event)"
          aria-describedby="search-help"
          autocomplete="off"
          spellcheck="false"
        />
        @if (value()) {
          <button
            type="button"
            class="search-clear"
            (click)="clear()"
            aria-label="Effacer la recherche"
          >×</button>
        }
      </div>
      <p id="search-help" class="search-help">
        @if (helpText()) {
          <span aria-live="polite">{{ helpText() }}</span>
        } @else {
          Tape au moins 2 caractères pour chercher dans les synthèses et analyses détaillées.
        }
      </p>
    </form>
  `,
  styles: [
    `
      .search {
        margin: 0;
      }
      .search-field {
        position: relative;
        display: flex;
        align-items: center;
      }
      .search-icon {
        position: absolute;
        left: 16px;
        width: 18px;
        height: 18px;
        color: var(--faint);
        pointer-events: none;
      }
      .search input {
        flex: 1;
        background: var(--surface);
        border: 1px solid var(--border-strong);
        color: var(--text);
        font: inherit;
        font-size: 16px;
        padding: 15px 46px 15px 46px;
        border-radius: 13px;
        width: 100%;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .search input::-webkit-search-cancel-button {
        display: none;
      }
      .search input:focus {
        outline: none;
        border-color: var(--brand);
        box-shadow: 0 0 0 3px var(--brand-soft);
      }
      .search input::placeholder {
        color: var(--faint);
      }
      .search-clear {
        position: absolute;
        right: 10px;
        background: transparent;
        border: none;
        color: var(--faint);
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
        background: var(--surface-2);
      }
      .search-help {
        margin: 0.5rem 2px 0;
        font-size: 12.5px;
        color: var(--faint);
      }
    `
  ]
})
export class SearchBoxComponent {
  readonly initial = output<void>();
  readonly queryChange = output<string>();

  /** Optional help text rendered under the field (e.g. result count). */
  readonly helpText = signal<string>('');
  readonly value = signal<string>('');

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('input');
  private debounce?: ReturnType<typeof setTimeout>;

  setHelp(text: string): void {
    this.helpText.set(text);
  }

  setValue(v: string): void {
    this.value.set(v);
    this.queryChange.emit(v);
  }

  onInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.value.set(v);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.queryChange.emit(v), 200);
  }

  clear(): void {
    this.value.set('');
    this.queryChange.emit('');
    this.inputRef()?.nativeElement.focus();
  }

  focus(): void {
    this.inputRef()?.nativeElement.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onDocKeydown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      this.focus();
    }
  }
}
