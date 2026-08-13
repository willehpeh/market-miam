import { AttributeValue } from '@opentelemetry/api';
import { SetMarketDayMenu } from '@market-miam/market-days';

type Extractor<C> = (command: C) => Record<string, AttributeValue>;

// Attribute policy lives here rather than in the gateway, which decorates every command and
// stays payload-blind: a command with no entry contributes nothing and its span is unchanged.
// Rules (O11Y-PLAN): raw values only for non-PII public data, free text never — derived
// scalars instead. An item count aggregates; the ids it counts would put catalogue contents
// on a span and aggregate over nothing.
const extractors = {
  SetMarketDayMenu: (command: SetMarketDayMenu) => ({ 'menu.item_count': command.itemIds.length }),
} satisfies Record<string, Extractor<never>>;

export function commandAttributes(command: object): Record<string, AttributeValue> {
  const extract = extractors[command.constructor.name as keyof typeof extractors];
  return extract ? extract(command as never) : {};
}
