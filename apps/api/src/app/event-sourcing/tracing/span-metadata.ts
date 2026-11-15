import { SpanMetadata } from '@market-miam/event-sourcing';
import { VENDOR_ID_METADATA_KEY } from '@market-miam/shared-kernel';

export const spanMetadata = new SpanMetadata({ [VENDOR_ID_METADATA_KEY]: 'vendor.id' });
