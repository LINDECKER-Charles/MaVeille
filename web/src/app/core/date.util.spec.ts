import { formatDateShort, parseIso, relativeDay } from './date.util';

describe('date.util', () => {
  it('parses an ISO date into a local Date without TZ drift', () => {
    const d = parseIso('2026-06-20');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // June (0-based)
    expect(d.getDate()).toBe(20);
  });

  it('formats a short FR date', () => {
    expect(formatDateShort('2026-06-20')).toMatch(/2026/);
  });

  it('returns the em-dash placeholder for null', () => {
    expect(formatDateShort(null)).toBe('—');
  });

  it('labels today / yesterday correctly', () => {
    const now = new Date();
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    expect(relativeDay(iso(now))).toBe("aujourd'hui");
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    expect(relativeDay(iso(y))).toBe('hier');
  });
});
