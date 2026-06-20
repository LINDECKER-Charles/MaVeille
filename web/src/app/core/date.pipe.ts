import { Pipe, PipeTransform } from '@angular/core';
import { formatDateFull, formatDateShort, relativeDay } from './date.util';

/** `iso | frDate` — long French date. `:'short'` and `:'relative'` variants. */
@Pipe({ name: 'frDate', standalone: true })
export class FrDatePipe implements PipeTransform {
  transform(iso: string | null, variant: 'full' | 'short' | 'relative' = 'full'): string {
    if (!iso) return formatDateShort(null);
    switch (variant) {
      case 'short':
        return formatDateShort(iso);
      case 'relative':
        return relativeDay(iso);
      default:
        return formatDateFull(iso);
    }
  }
}
