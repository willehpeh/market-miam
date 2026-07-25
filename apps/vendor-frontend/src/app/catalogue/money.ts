export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function formatEuros(cents: number): string {
  return `${centsToEuros(cents)} €`;
}

export function parseEurosToCents(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  return Math.round(parseFloat(normalized) * 100);
}
