# M4 — AAD binds identity but not position; ciphertexts swappable within a stream

| | |
|---|---|
| Severity | Low-Medium |
| Area | Crypto-shredding |
| Files | `packages/event-sourcing/src/adapters/shredding.event-store.ts:91-93` |
| Status | Open |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

The GCM additional authenticated data is built from stream, type, and field
(newline-separated template literal):

```ts
function aad(streamId: string, eventType: string, field: string): Buffer {
  return Buffer.from(`${streamId}\n${eventType}\n${field}`, 'utf8');
}
```

This correctly binds a ciphertext to *whose* field it is — a ciphertext moved to
another vendor's event fails authentication. But it does not bind *which
occurrence*: two events of the same type in the same stream produce
interchangeable ciphertexts for the same field. Someone with write access to the
`events` table could swap a vendor's current encrypted name for their previous
one and it would decrypt and authenticate cleanly.

Severity is tempered by two real mitigations: the append-only trigger
(`database/migrations/0001:24-26`) blocks UPDATEs at the DB layer, so the attack
requires superuser/trigger-bypass access; and the swap only rearranges values
the same subject already produced. It remains the class of tampering AAD exists
to make detectable.

## Failure scenario

An attacker (or a buggy migration script) with trigger-bypassing DB access
rewrites `payload` ciphertexts between two same-type events in one stream —
e.g. reverting a storefront's edited phone number to a prior value. Replay and
projections rebuild from the swapped values with no cryptographic alarm; the
tamper is invisible unless someone diffs against a backup.

## Evidence

Static: the `aad()` body at the cited lines. **Empirical, from the evaluation's
Stryker run: mutating the AAD template to an empty string survives**
(`shredding.event-store.ts:92`, two surviving StringLiteral mutants) — no test
in the mutation net detects that the AAD exists at all, let alone what it binds.
The container suite tests the wrong-master-key path but never swaps a
ciphertext or a wrapped key between rows.

## Suggested fix

Include the event's position (or its `id`) in the AAD:

```ts
aad(streamId, event.type, field, streamPosition)
// `${streamId}\n${eventType}\n${field}\n${streamPosition}`
```

Cost is near zero on the write path. Two things to handle:

1. **Compatibility**: existing ciphertexts were sealed under the old AAD.
   Version the AAD alongside the envelope (`enc:v2:` uses the extended AAD;
   `enc:v1:` decrypts with the old one) — this rides naturally on the
   keyring/versioning work in [M2](m2-master-key-rotation-impossible.md).
2. **Encrypt-time availability**: `encrypt` runs before the row exists, so the
   position must come from the append flow's `expectedStreamPosition` +
   offset — available in `ShreddingEventStore.append`'s signature today.

Regression tests to pin it: (a) a decrypt-side spec that swaps two same-field
ciphertexts between same-type events in one stream and asserts load **throws**;
(b) a spec asserting the AAD is non-empty and position-sensitive (kills the
surviving mutants). The separator ambiguity (newline inside a component) is
theoretical for UUID-based stream ids, but length-prefixing the components
while versioning the AAD closes it for free.
