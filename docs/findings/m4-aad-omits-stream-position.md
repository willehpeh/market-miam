# M4 — AAD binds identity but not position; ciphertexts swappable within a stream

| | |
|---|---|
| Severity | Low-Medium |
| Area | Crypto-shredding |
| Files | `packages/event-sourcing/src/adapters/shredding.event-store.ts:91-93` |
| Status | **Fixed** ([ADR 0041](../adr/0041-aad-v2-binds-stream-position.md)) |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

The GCM additional authenticated data is built from stream, type, and field
(NUL-separated template literal):

```ts
function aad(streamId: string, eventType: string, field: string): Buffer {
  return Buffer.from(`${streamId}\u0000${eventType}\u0000${field}`, 'utf8');
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
// `${streamId}\u0000${eventType}\u0000${field}\u0000${streamPosition}`
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
surviving mutants). The separator ambiguity (a NUL inside a component) is
theoretical for UUID-based stream ids, but length-prefixing the components
while versioning the AAD closes it for free.

## Update (2026-08-01): fixed

Fixed as suggested ([ADR 0041](../adr/0041-aad-v2-binds-stream-position.md)):
`encrypt` now writes `enc:v2:`, whose AAD adds the stream position and
length-prefixes every component (the separator-ambiguity closure this finding
predicted would come for free). The position is bound pre-insert from
`expectedStreamPosition + offset`, exactly as suggested; `enc:v1:` values
decrypt under the old AAD verbatim, forever. Both regression tests this
finding asked for are pinned in `shredding.event-store.spec.ts` — the
same-stream swap now throws (killing the surviving AAD mutants), plus a
cross-stream move under a shared subject key that isolates the streamId
binding. The versioning rode on the discriminator pattern of
[M2](m2-master-key-rotation-impossible.md)'s fix (ADR 0040), as anticipated.

## Update (2026-08-01): separator correction

This finding originally quoted the separator as `\n`. The actual separator is
a NUL — and it was a **literal 0x00 byte embedded in the source file**, which
is why the misquote happened: the byte is invisible in editors and made git
classify `shredding.event-store.ts` as binary (no diffs rendered anywhere).
The literal bytes have been replaced with visible `\u0000` escapes — the
identical runtime string, so no behaviour change and no compatibility impact
on existing ciphertexts; the file diffs as text again. The finding itself
(position omitted from the AAD, surviving AAD mutants) is unchanged and still
open; the AAD-content regression test belongs to this finding's fix.
