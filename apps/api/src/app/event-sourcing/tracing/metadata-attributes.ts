import { MetadataAttributes } from '@market-miam/event-sourcing';
import { VENDOR_ID_METADATA_KEY } from '@market-miam/shared-kernel';

// What every append and every handled event carries onto its span beyond lineage: the vendor,
// the primary high-cardinality dimension (ADR 0026), stamped by the shared kernel's vendor-scoped
// writes. Decided here, as the PII subject is, not in the package.
export const metadataAttributes: MetadataAttributes = { [VENDOR_ID_METADATA_KEY]: 'vendor.id' };
