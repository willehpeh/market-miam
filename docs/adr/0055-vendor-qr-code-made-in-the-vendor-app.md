# 0055. The vendor's QR code is made in the vendor app

Date: 2026-09-11 · Status: Accepted

## Context

A traiteur wants a QR code on the stall, the flyer and the menu board that sends a
customer to their vitrine. It should look like Market Miam — our mark on their stall
is how the product spreads from one market to the next.

The obvious place to reach for is the API: a `GET /storefront/qr-code.png` endpoint,
a server-side rasteriser, a cache. Yet everything the code encodes is already in the
vendor app. The subdomain arrives on the storefront view; `storefront-url.ts` already
joins it to the base domain for the *Partager* button; the brand lives in
`packages/design-system` and `assets/`. Nothing the server knows and the browser does
not goes into the image.

## Decision

**The code is built in the browser, from the address alone.** `brandedQrCode(url)` is
a pure function: the address in, a module matrix and an SVG out. It encodes with
[`uqr`](https://github.com/unjs/uqr) — a zero-dependency port of Nayuki's reference
encoder, ~10 kB, loaded with the screen's own chunk — at error-correction level H.

**Branding is in the SVG itself.** Data modules in `--mm-brand-deep`, the three finder
squares rounded and in `--mm-brand`, the *mm* wordmark set in a window cleared from
the middle. The wordmark's paths are inlined as a constant rather than referenced from
`assets/`: an SVG shown through `<img>` or drawn onto a canvas may fetch nothing
external, so a `<use href>` would render blank exactly where the branding goes.

**The window is bounded by a decode test, not by taste.** Level H recovers up to 30% of
damaged codewords; a window at 0.4 of the code's width stays under a tenth of the
modules at every version a storefront address can reach — that margin is what a flyer
under a tarpaulin gets. `branded-qr-code.spec.ts` rasterises the matrix, finders in
one brand colour and data in the other, and decodes it with `jsqr` at the shortest
address, a typical one, and the longest label a hostname allows. The screen's spec
pins that what the vendor sees is that same SVG.

**Export is a port with a fake, per ADR 0022.** `QrCodeDownload.save()` takes the SVG,
a caption and a file name. `CanvasQrCodeDownload` decodes the SVG into an image,
draws it at 2048 px with the address set under it in the design font, encodes a PNG
and offers it through an anchor — browser plumbing jsdom cannot run, so it carries no
spec, exactly as `CanvasPhotoDownscale` does; `FakeQrCodeDownload` is what the screen
is tested against. The port rejects when it could not deliver, and the screen says so.

## Consequences

- No new endpoint, projection or storage. The vendor app and the design system are the
  only things this feature touches, and the API's surface is unchanged.
- Two dependencies: `uqr` (runtime, lazy) and `jsqr` (dev, in the spec only). Both
  have no dependencies of their own.
- The colours are spelt out in `branded-qr-code.ts` rather than read from the
  tokens. A pure function cannot read a custom property, and the code should carry
  Market Miam's terracotta whatever accent theme the page around it uses — the
  accent themes in `tokens.css` are the vendor's, the mark on the stall is ours.
- A change to the wordmark asset has to be copied into `market-miam-wordmark.ts` by
  hand. The file says where it came from.
- The PNG's caption is drawn on the canvas, not in the SVG: the SVG may not load a
  web font any more than an image, while the canvas draws with what the page has
  loaded. The on-screen preview therefore shows the code and the address as two
  elements, and the file joins them.

## Rejected

| Option | Why not |
|---|---|
| An API endpoint rendering the PNG | A server-side rasteriser, an authenticated route and a second copy of the brand assets, to compute something from data the browser already holds |
| A third-party QR image service | Sends every vendor's address to someone else at every view, against the self-hosting stance the design system already took for fonts; and carries no branding |
| A plain black-and-white code | Scans no better in practice at this window size, and the code on the stall is the one place the product's mark reaches a customer before the vitrine does |
| The wordmark drawn over the image at export time | Two renderings that drift; the SVG is the one source, shown and exported |

Builds on ADRs 0003, 0022, 0023, 0032.
