export class SpanMetadata {
  static none(): SpanMetadata {
    return new SpanMetadata({});
  }

  constructor(private readonly attributeByMetadataKey: Readonly<Record<string, string>>) {}

  attributesFrom(metadata: Record<string, unknown> | undefined): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.attributeByMetadataKey).map(([key, attribute]) => [attribute, metadata?.[key] as string]),
    );
  }
}
