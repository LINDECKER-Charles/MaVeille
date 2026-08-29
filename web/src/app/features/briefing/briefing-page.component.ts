import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { PageMetaService } from '../../core/page-meta.service';
import { map } from 'rxjs';
import { DigestStore } from '../../core/digest-store.service';
import { SeenService } from '../../core/seen.service';
import { formatDateFull } from '../../core/date.util';
import type { RenderedDigest } from '../../data/types';
import { BriefingViewComponent } from './briefing-view.component';
import { SubjectReaderComponent } from './subject-reader.component';
import { toDaySubjects, toSyntheses, toTakeaways } from './day-subjects';

/**
 * Le briefing d'une journée, et la lecture d'un de ses sujets.
 *
 * Une seule route pour les deux : `?sujet=<slug>-<index>` bascule en mode
 * lecture. Ça évite de prérendre une page par sujet (426 aujourd'hui) tout en
 * gardant un permalien partageable vers un sujet précis.
 */
@Component({
  selector: 'app-briefing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BriefingViewComponent, SubjectReaderComponent],
  // L'hôte s'efface : c'est `.screen` qui doit être l'enfant flex de
  // `.shell__main`, sinon la colonne de contenu perd sa hauteur et son défilement.
  styles: `
    :host {
      display: contents;
    }
  `,
  template: `
    @if (subject(); as s) {
      <app-subject-reader
        [subject]="s"
        [siblings]="subjects()"
        [date]="date()"
        [dayTitle]="dayTitle()"
      />
    } @else if (digest()) {
      <app-briefing-view
        [date]="date()"
        [dayTitle]="dayTitle()"
        [subjects]="subjects()"
        [takeaways]="takeaways()"
        [syntheses]="syntheses()"
        [newCount]="newCount()"
      />
    } @else {
      <div class="screen">
        <div class="screen__head">
          <div class="screen__heading">
            <h1 class="screen__title">{{ dayTitle() }}</h1>
            <div class="screen__sub">{{ notFound() ? 'Digest introuvable.' : 'Chargement…' }}</div>
          </div>
        </div>
      </div>
    }
  `
})
export class BriefingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(DigestStore);
  private readonly seen = inject(SeenService);
  private readonly pageMeta = inject(PageMetaService);

  private readonly digestSignal = signal<RenderedDigest | null>(null);
  protected readonly notFound = signal(false);

  /**
   * Nombre de digests plus récents que le marqueur « déjà vu », photographié à
   * l'entrée sur la page. Il faut le lire AVANT `seen.acknowledge()`, qui fait
   * justement avancer ce marqueur — sinon la pastille vaudrait toujours zéro.
   */
  protected readonly newCount = signal(0);

  /** Date affichée : celle de l'URL, sinon le digest le plus récent. */
  readonly date = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('date') ?? this.store.digests[0]?.date ?? '')),
    { initialValue: this.store.digests[0]?.date ?? '' }
  );

  private readonly sujetParam = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('sujet'))),
    { initialValue: null }
  );

  protected readonly digest = this.digestSignal.asReadonly();
  protected readonly dayTitle = computed(() =>
    this.date() ? `Briefing du ${formatDateFull(this.date())}` : 'Aucun digest'
  );

  protected readonly subjects = computed(() => {
    const d = this.digest();
    return d ? toDaySubjects(d, this.store) : [];
  });

  protected readonly takeaways = computed(() => {
    const d = this.digest();
    return d ? toTakeaways(d, this.store) : [];
  });

  protected readonly syntheses = computed(() => {
    const d = this.digest();
    return d ? toSyntheses(d, this.store) : [];
  });

  /** Description de la page : l'accroche générée du jour, sinon son volume. */
  private readonly description = computed(() => {
    const meta = this.store.digests.find((d) => d.date === this.date());
    if (!meta) return 'La veille technologique du jour.';
    return (
      meta.headline ??
      `${meta.totalSubjects} sujets sur ${meta.categories.length} thématiques, ` +
        `${meta.totalSources} sources · lecture ~${meta.readingMinutes} min.`
    );
  });

  /** Sujet ouvert, ou null en mode briefing. */
  protected readonly subject = computed(() => {
    const key = this.sujetParam();
    return key ? (this.subjects().find((s) => s.key === key) ?? null) : null;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => void this.load());
  }

  private async load(): Promise<void> {
    const date = this.date();
    this.digestSignal.set(null);
    this.notFound.set(false);

    if (!date) {
      this.notFound.set(true);
      return;
    }

    // Une date inconnue dans l'URL ne doit pas laisser une page vide.
    if (!this.store.hasDigest(date)) {
      this.notFound.set(true);
      this.pageMeta.set('Digest introuvable', "Aucun digest ne correspond à cette date.");
      void this.router.navigate(['/'], { replaceUrl: true });
      return;
    }

    const loaded = await this.store.loadDigest(date);
    this.digestSignal.set(loaded);
    this.notFound.set(loaded === null);
    this.newCount.set(this.seen.countNew(this.store.listDates()));
    this.seen.acknowledge(date);
    this.pageMeta.set(this.dayTitle(), this.description());
  }
}
