// Metadata keys an application stamps on its events, each with the span attribute that carries
// it: `{ tenantId: 'tenant.id' }`. The package reads only its own keys, lineage's and the
// traceparent; which others ride every append and handled event, and under what names, is the
// application's to say (ADR 0026), as the PII subject is (ShreddingEventStore).
export type MetadataAttributes = Readonly<Record<string, string>>;

export function attributesFrom(
  metadata: Record<string, unknown> | undefined,
  metadataAttributes: MetadataAttributes,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadataAttributes).map(([key, attribute]) => [attribute, metadata?.[key] as string]),
  );
}
