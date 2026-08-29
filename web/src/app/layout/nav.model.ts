import { IsActiveMatchOptions, Params } from '@angular/router';
import { IconName } from '../ui/icon.data';

/**
 * Options d'activation par défaut : un chemin exact, les query params ignorés.
 * Convient à toute destination qui n'est pas discriminée par un filtre d'URL.
 */
export const EXACT_PATH: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored'
};

/** Actif aussi sur les sous-routes, ex. `/rapports` depuis `/rapports/2026-W24`. */
export const PATH_PREFIX: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored'
};

/**
 * Destinations distinguées par leurs query params — les quatre thématiques
 * pointent toutes sur `/fil`, seul `?cat=` les sépare.
 */
export const EXACT_QUERY: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'exact',
  matrixParams: 'ignored',
  fragment: 'ignored'
};

/** Une destination du rail. `mono` remplace l'icône pour les thématiques. */
export interface NavEntry {
  readonly path: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly mono?: string;
  readonly queryParams?: Params;
  readonly activeOptions: IsActiveMatchOptions;
  /** Compteur affiché à droite (sujets, jours, pourcentage lu…). */
  readonly meta?: string;
}

/** Un groupe titré du rail : « Aujourd'hui », « Fil », « Thématiques »… */
export interface NavGroup {
  readonly title: string;
  readonly entries: readonly NavEntry[];
}
