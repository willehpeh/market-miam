---
name: Event payload design
description: Events should be self-describing with all relevant data in the payload, even if it duplicates the stream ID
type: feedback
---

Events should contain all relevant data in their payload (e.g., marketId, date), even if that data is also encoded in the stream ID. This allows stream IDs to be refactored freely without breaking projections or event consumers.

**Why:** Stream IDs are an implementation detail that may change. Events are the source of truth and should be self-describing.

**How to apply:** Don't treat redundancy between stream IDs and event payloads as a problem. Include domain-relevant identifiers in the event payload.