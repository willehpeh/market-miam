import { LocalDate, LocalDateTime, LocalTime } from '@market-miam/common';

const at = (date: string, time: string) => new LocalDateTime(new LocalDate(date), new LocalTime(time));

describe('LocalDateTime', () => {
  it('orders two moments on the same day by their time', () => {
    expect(at('2026-06-20', '08:00').isNotAfter(at('2026-06-20', '14:00'))).toBe(true);
    expect(at('2026-06-20', '14:00').isNotAfter(at('2026-06-20', '08:00'))).toBe(false);
  });

  it('orders two moments on different days by their date, whatever the time', () => {
    expect(at('2026-06-20', '23:59').isNotAfter(at('2026-06-21', '00:00'))).toBe(true);
    expect(at('2026-06-21', '00:00').isNotAfter(at('2026-06-20', '23:59'))).toBe(false);
  });

  // "Not after" includes the moment itself — a market is still open through its final minute.
  it('counts a moment as not after itself', () => {
    expect(at('2026-06-20', '14:00').isNotAfter(at('2026-06-20', '14:00'))).toBe(true);
  });
});
