// ponytail: French single-region labels, keyed off the weekday the API already sends and
// the ISO date's own parts — no Intl and no locale registration, matching the customer
// app's storefront-view-model.
export const DAY_LABELS: Record<string, string> = {
  MON: 'Lundi',
  TUE: 'Mardi',
  WED: 'Mercredi',
  THU: 'Jeudi',
  FRI: 'Vendredi',
  SAT: 'Samedi',
  SUN: 'Dimanche',
};

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function longDate(weekday: string, isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${DAY_LABELS[weekday] ?? weekday} ${Number(day)} ${MONTHS[Number(month) - 1] ?? ''}`;
}

export function timeRange(day: { startTime?: string; endTime?: string }): string {
  if (!day.startTime) {
    return '';
  }
  const start = formatTime(day.startTime);
  return day.endTime ? `${start} – ${formatTime(day.endTime)}` : start;
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = String(Number(hours));
  return minutes === '00' ? `${hour}h` : `${hour}h${minutes}`;
}
