export function subdomainFrom(host: string | null, queryParam: string | null): string | null {
  const label = host?.split(':')[0].split('.')[0] ?? '';
  if (label && label !== 'localhost') return label;
  return queryParam?.trim() || null;
}
