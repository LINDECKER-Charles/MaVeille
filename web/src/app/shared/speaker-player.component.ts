import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  signal,
  untracked
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Lecteur vocal inline — DEV UNIQUEMENT.
 *
 * S'appuie sur le sous-projet `speaker/` (backend TTS local, port 8830). Rendu
 * uniquement quand `isDevMode()` est vrai et côté navigateur : en build de
 * production (site statique prerendu), `isDevMode()` renvoie `false`, donc ce
 * composant n'émet aucun DOM — aucun impact sur le site déployé, e2e, a11y ou
 * Lighthouse. La lecture audio se fait via `<audio src>` cross-origin (autorisé) ;
 * la liste des voix et le rendu MP3 passent par le CORS dev du backend speaker.
 */

interface SpeakerVoice {
  id: string;
  label: string;
  gender: string;
}

const SPEAKER_BASE = 'http://localhost:8830';

/** Chargé une seule fois puis partagé entre toutes les instances du lecteur. */
let voicesCache: Promise<SpeakerVoice[]> | null = null;
function loadVoices(): Promise<SpeakerVoice[]> {
  if (!voicesCache) {
    voicesCache = fetch(`${SPEAKER_BASE}/api/voices`).then((r) => {
      if (!r.ok) throw new Error('speaker offline');
      return r.json() as Promise<SpeakerVoice[]>;
    });
  }
  return voicesCache;
}

@Component({
  selector: 'app-speaker-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      @if (offline()) {
        <div class="speaker offline">
          <span class="sp-hint">🎧 Speaker hors ligne — lance <code>speaker.cmd</code></span>
        </div>
      } @else {
        <div class="speaker" role="group" aria-label="Lecture vocale (dev)">
          <audio
            #audio
            (play)="playing.set(true)"
            (pause)="playing.set(false)"
            (timeupdate)="onTime()"
            (loadedmetadata)="onTime()"
            (ended)="playing.set(false)"
          ></audio>

          <button
            type="button"
            class="sp-btn sp-play"
            (click)="toggle()"
            [attr.aria-label]="playing() ? 'Pause' : 'Écouter à voix haute'"
          >
            <span aria-hidden="true">{{ playing() ? '⏸' : '🎧' }}</span>
            @if (!started()) {
              <span class="sp-lbl">Écouter</span>
            }
          </button>

          @if (started()) {
            <button type="button" class="sp-btn" (click)="skip(-15)" aria-label="Reculer 15 secondes">
              <span aria-hidden="true">⏮</span>
            </button>
            <button type="button" class="sp-btn" (click)="skip(15)" aria-label="Avancer 15 secondes">
              <span aria-hidden="true">⏭</span>
            </button>
            <div class="sp-progress" (click)="seek($event)" aria-hidden="true">
              <div class="sp-bar" [style.width.%]="pct()"></div>
            </div>
            <span class="sp-time">{{ fmt(current()) }} / {{ fmt(duration()) }}</span>
          }

          <label class="sp-ctrl">
            <span class="sp-vis">Voix</span>
            <select [value]="voice()" (change)="onVoice($event)">
              @for (v of voices(); track v.id) {
                <option [value]="v.id">{{ v.label }}</option>
              }
            </select>
          </label>

          <label class="sp-ctrl sp-speed">
            <span class="sp-vis">Vitesse {{ speed().toFixed(2) }}×</span>
            <input
              type="range"
              min="0.75"
              max="2"
              step="0.05"
              [value]="speed()"
              (input)="onSpeed($event)"
              aria-label="Vitesse de lecture"
            />
          </label>

          <button
            type="button"
            class="sp-btn"
            (click)="download()"
            [disabled]="downloading()"
            aria-label="Télécharger le MP3"
          >
            <span aria-hidden="true">⬇</span>
          </button>

          @if (status()) {
            <span class="sp-hint">{{ status() }}</span>
          }
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .speaker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding: 5px 8px;
        border: 1px dashed var(--border-strong, var(--border));
        border-radius: var(--radius-sm, 8px);
        background: var(--surface, transparent);
        font-size: 12.5px;
      }
      .speaker.offline {
        border-style: solid;
        opacity: 0.75;
      }
      .sp-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 28px;
        padding: 0 9px;
        border: 1px solid var(--border-strong, var(--border));
        border-radius: var(--radius-sm, 8px);
        background: var(--bg, transparent);
        color: var(--text);
        font: inherit;
        font-size: 12.5px;
        cursor: pointer;
        transition: border-color 0.14s ease, color 0.14s ease;
      }
      .sp-btn:hover {
        border-color: var(--brand, var(--accent));
        color: var(--brand, var(--accent));
      }
      .sp-btn:focus-visible {
        outline: 2px solid var(--brand, var(--accent));
        outline-offset: 2px;
      }
      .sp-btn:disabled {
        opacity: 0.5;
        cursor: progress;
      }
      .sp-play {
        font-weight: 600;
      }
      .sp-progress {
        width: 120px;
        height: 5px;
        border-radius: 999px;
        background: var(--border, #ccc);
        cursor: pointer;
        overflow: hidden;
      }
      .sp-bar {
        height: 100%;
        width: 0;
        background: var(--brand, var(--accent));
      }
      .sp-time {
        font-family: var(--font-mono, monospace);
        color: var(--faint, var(--muted));
        font-variant-numeric: tabular-nums;
      }
      .sp-ctrl {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--faint, var(--muted));
      }
      .sp-ctrl select {
        background: var(--bg, transparent);
        color: var(--text);
        border: 1px solid var(--border-strong, var(--border));
        border-radius: 6px;
        padding: 3px 6px;
        font: inherit;
        font-size: 12px;
      }
      .sp-ctrl input[type='range'] {
        width: 96px;
        accent-color: var(--brand, var(--accent));
      }
      .sp-hint {
        color: var(--faint, var(--muted));
      }
      .sp-hint code {
        font-family: var(--font-mono, monospace);
        background: var(--brand-soft, rgba(99, 102, 241, 0.12));
        padding: 1px 5px;
        border-radius: 4px;
      }
      @media (max-width: 640px) {
        .sp-progress {
          width: 80px;
        }
        .sp-ctrl input[type='range'] {
          width: 70px;
        }
      }
    `
  ]
})
export class SpeakerPlayerComponent {
  /** Id speaker de la veille (ex. `categorie/IA/2026-05-27_synthese`). */
  readonly veilleId = input.required<string>();
  /** Faux si le fichier correspondant n'existe pas (ex. détail absent). */
  readonly available = input(true);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly dev = isDevMode();
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly show = computed(() => this.dev && this.isBrowser && this.available());

  readonly voices = signal<SpeakerVoice[]>([]);
  readonly voice = signal('ff_siwis');
  readonly offline = signal(false);
  readonly started = signal(false);
  readonly playing = signal(false);
  readonly current = signal(0);
  readonly duration = signal(0);
  readonly speed = signal(1);
  readonly status = signal('');
  readonly downloading = signal(false);

  readonly pct = computed(() => {
    const d = this.duration();
    return d > 0 ? (this.current() / d) * 100 : 0;
  });

  constructor() {
    if (this.isBrowser && this.dev) {
      loadVoices()
        .then((vs) => {
          this.voices.set(vs);
          if (vs[0]) this.voice.set(vs[0].id);
        })
        .catch(() => this.offline.set(true));
    }
    // Réinitialise la lecture quand la veille change (onglet, synthèse/détail, navigation).
    effect(() => {
      this.veilleId();
      untracked(() => this.reset());
    });
  }

  private audio(): HTMLAudioElement | null {
    return this.host.nativeElement.querySelector('audio');
  }

  private audioUrl(): string {
    const id = encodeURIComponent(this.veilleId());
    const v = encodeURIComponent(this.voice());
    return `${SPEAKER_BASE}/api/veilles/${id}/audio?voice=${v}&speed=1.0`;
  }

  toggle(): void {
    const a = this.audio();
    if (!a) return;
    if (!this.started()) {
      this.start(a);
    } else if (a.paused) {
      void a.play().catch(() => this.status.set('Lecture impossible'));
    } else {
      a.pause();
    }
  }

  private start(a: HTMLAudioElement): void {
    a.src = this.audioUrl();
    a.playbackRate = this.speed();
    this.started.set(true);
    this.status.set('');
    // Un échec de play() = politique d'autoplay du navigateur (NotAllowedError),
    // pas un backend absent : on garde les contrôles, l'utilisateur relance via ▶.
    void a.play().catch((e: unknown) => {
      const name = e instanceof DOMException ? e.name : '';
      this.status.set(name === 'NotAllowedError' ? '' : 'Lecture impossible');
    });
  }

  onVoice(e: Event): void {
    this.voice.set((e.target as HTMLSelectElement).value);
    const a = this.audio();
    if (a && this.started()) {
      a.src = this.audioUrl();
      a.playbackRate = this.speed();
      void a.play().catch(() => this.status.set('Lecture impossible'));
    }
  }

  onSpeed(e: Event): void {
    const v = parseFloat((e.target as HTMLInputElement).value);
    this.speed.set(v);
    const a = this.audio();
    if (a) a.playbackRate = v;
  }

  skip(delta: number): void {
    const a = this.audio();
    if (a) a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
  }

  seek(e: MouseEvent): void {
    const a = this.audio();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (a && a.duration) a.currentTime = ratio * a.duration;
  }

  onTime(): void {
    const a = this.audio();
    if (!a) return;
    this.current.set(a.currentTime);
    this.duration.set(isFinite(a.duration) ? a.duration : 0);
  }

  async download(): Promise<void> {
    this.downloading.set(true);
    this.status.set('Génération du MP3…');
    try {
      const res = await fetch(
        `${SPEAKER_BASE}/api/veilles/${encodeURIComponent(this.veilleId())}/render`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice: this.voice(), speed: 1.0 })
        }
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { url: string; bytes: number };
      const a = document.createElement('a');
      a.href = `${SPEAKER_BASE}${data.url}`;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
      this.status.set(`Prêt · ${Math.round(data.bytes / 1024)} Ko`);
    } catch {
      this.status.set('Échec de la génération');
      this.offline.set(true);
    } finally {
      this.downloading.set(false);
    }
  }

  fmt(sec: number): string {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  private reset(): void {
    const a = this.audio();
    if (a) {
      a.pause();
      a.removeAttribute('src');
    }
    this.started.set(false);
    this.playing.set(false);
    this.current.set(0);
    this.duration.set(0);
    this.status.set('');
  }
}
