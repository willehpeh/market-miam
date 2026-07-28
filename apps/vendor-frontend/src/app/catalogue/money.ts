export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

// A no-break space before the € — French typography wants one, and it keeps the amount
// whole so a cramped row breaks after "dès" instead of between the digits and the sign.
export function formatEuros(cents: number): string {
  return `${centsToEuros(cents)}\u00a0€`;
}

export function parseEurosToCents(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  return Math.round(parseFloat(normalized) * 100);
}
