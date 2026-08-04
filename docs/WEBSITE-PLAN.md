# Website — Status & Remaining Work

`apps/website` (Astro, static) at `marketmiam.fr` / `www.`. Purpose: convert vendors into the pilot — 5–10 hand-onboarded traiteurs, not self-serve signup. Sells what ships today; names what doesn't.

## Shipped (`d1eef8c` … `64ab3a4`)

Single page, French, plain CSS over `packages/design-system/tokens.css`.

- Hero → problem → *Disponible aujourd'hui* (vitrine, carte, marchés) → *Ce qui arrive ensuite* → pilot terms → footer
- Tally popup lead capture, form `aQX9NB` (nom / adresse mail / marchés où vous exercez)
- `og:*` + `twitter:*` + canonical in `Base.astro`; `og.jpg` 1200×630
- Hero shot links to the live demo storefront
- Assets in `public/` are generated — provenance and regeneration recipe in `apps/website/README.md`

### Vocabulary pass (`55073a6`)

The page spoke web and back-office; the product speaks traiteur. Now aligned with the
vendor app and the customer storefront.

| Was | Now | Why |
|---|---|---|
| catalogue | **carte** | `catalogue` is the aggregate name in `packages/market-days` and had leaked outward. The storefront already lists dishes under *Notre carte*. |
| une page | **vitrine** | The vendor app says *Ma vitrine* / *Créer ma vitrine*; the storefront footer signs off *Vitrine mijotée par Market Miam*. Never appeared on the site before. |
| page vendeur (alt text) | vitrine | *vendeur* is the `Vendor` aggregate — internal. Public-facing it's *traiteur*. |
| vous jetez | invendus | The trade word, and *jeter* is unfair to what they actually do. |
| quoi apporter | quoi préparer la veille | Names the moment the decision is actually made. |
| place de marché | plateforme | Correct French for *marketplace*, but it collides head-on with the **place du marché** these vendors work on. |

**carte vs menu is a deliberate split.** *Carte* is the standing list (the catalogue),
*menu* is the day's offering (the market day). So *Le menu du jour* is right and *carte
du jour* is not — the hero alt text says *sa carte* because what's in the screenshot is
the standing carte, and the menu du jour isn't built.

Also swapped in `Base.astro`'s meta description, which is what Google shows.

### SEO plumbing

- `site` in `astro.config.mjs` is the one place the origin lives; `Base.astro` builds
  canonical/og/JSON-LD URLs from `Astro.site` instead of a hard-coded string.
- `@astrojs/sitemap` generates `sitemap-index.xml` + `sitemap-0.xml` at build;
  `public/robots.txt` allows everything and points at the index.
- JSON-LD in `Base.astro`: `Organization` (name, logo, email) + `WebSite`, linked by
  `@id` — the brand-panel signals, nothing page-specific.
- A keyword-bearing `<title>` (*vitrine en ligne pour traiteurs de marché*) was
  considered and rejected: the roadmap makes Market Miam more than a vitrine, so a
  feature-keyword title would undersell it and date at every launch. The slogan title
  stays (decision below); keyword coverage is content pages' job, still open.

### CTAs (`55073a6`, `d233015`)

Both in-page CTAs read *Rejoignez les premiers traiteurs*, matching the title of the Tally
form they open. The header CTA keeps *Rejoindre le pilote* — it's navigation, not the ask.
*La phase pilote* stays as the programme's name in the eyebrow and the note under the hero
button.

Centred below `56rem`, flush left above it — the same breakpoint where the hero splits into
two columns, so the CTA realigns with the text it belongs to rather than at a width of its
own.

### Demo storefront link (`d7afdff`)

`demo.marketmiam.fr` is a **real published storefront in production**. It has nothing to do
with `apps/api/src/app/dev-seed.ts`, which is `NODE_ENV=development` only — do not reason
from that seed to conclude there is no demo. That inference has been made once and it was
wrong. `apps/website/README.md:19` is accurate: `storefront-demo.webp` really is a shot of
that page.

The hero shot links to it from a `<figcaption>`. A text link, not a second button: the page
has one job and a second button competes with it. New tab + `rel="noopener"` so the detour
doesn't cost the landing page.

### Roadmap section (`f32ace5`, `a49c622`, `64ab3a4`)

Four bullets, led by the **miam** (bold, `--mm-brand-deep`). The lede ends *"Nous le
construisons dans cet ordre."* — order beats disclaimer. The section already says once that
none of it is online; repeating that across a longer list reads as vapour, whereas a stated
sequence reads as a queue someone is working through.

The bullets sit at deliberately different distances. What's actually behind each:

| Bullet | Reality |
|---|---|
| menu du jour + *il n'y en a plus* | Domain built — `market-day/`, `plan-items-for-market-day`, `mark-item-as-sold-out`, `ItemMarkedAsSoldOut`. **No UI in either frontend.** Cheapest roadmap item to actually ship, and it's a frontend job, not a domain one. |
| le miam | **Nothing built.** No aggregate, no event, no handler; `NEXT_BEHAVIOURS.md` has *item rated for market day* unstarted. Furthest-out thing on the page — have an answer ready for *"when?"* |
| post-market feedback per dish | Not built |
| repères over time | Not built |

**Why the miam earns its line despite being unbuilt:** it's the namesake, and it's the only
roadmap item where the *customer* does something rather than the vendor doing admin — which
is what makes a product read as alive. *"sans commander, sans payer"* is load-bearing: it's
the honest description (a private demand signal, not an order — `MARKET_MIAM.md:42`) and it
heads off the reading that this is becoming a delivery marketplace.

Roadmap length is capped on purpose. Three shipped things against four coming is already the
edge; more future items and the shipped-to-promised ratio tips the page into reading like a
pre-launch teaser, which is the opposite of the intent.

## Remaining

### 1. Post-deploy verification (blocking, do first)

| Check | Status |
|-------|--------|
| Load on a phone | Layout has now been checked at 390px in headless Chromium (Playwright against the built `dist/`), so the old *"Chrome refused to resize"* blocker is gone. A real device is still worth one look — a screenshot can't catch tap targets, iOS font fallback, or the Tally overlay on a small screen. |
| Click a CTA on the real domain | **Still unverified.** Tally popup has only ever been confirmed against `localhost`. |
| Click the demo link on the real domain | **Still unverified.** `demo.marketmiam.fr` has never been loaded from a dev container — the agent proxy 403s that host. |
| Paste URL into WhatsApp | First moment `/og.jpg` is reachable; confirms the card renders |

Scraper caches are sticky. `og.jpg` itself is unchanged, but **`og:description` changed** in
the vocabulary pass — any link already shared keeps showing *catalogue* until a forced
re-scrape. Regenerating `og.jpg` later needs a forced re-scrape or a new filename.

### 2. Tally consent text

Now a **layered notice** (CNIL *information à deux niveaux*): the form carries a short first
layer, `/mentions-legales` carries the rest. Only possible because §3 shipped.

Under *Adresse mail* — **keep as-is.** This is conversion copy, not compliance copy: it
answers the hesitation at the exact field where people hesitate. Cutting it saves nothing
legally and costs leads.

> Votre adresse ne servira qu'à vous recontacter au sujet de la phase pilote. Pas de newsletter, pas de partage avec des tiers.

Above *Envoyer* — the short version, replacing the original three-sentence block:

> Vos réponses servent uniquement à vous recontacter au sujet de la phase pilote. Ni revendues, ni transmises à des tiers. Conservation, vos droits et comment les exercer : https://marketmiam.fr/mentions-legales

- **The URL must be absolute.** The form renders in Tally's overlay, so a relative
  `/mentions-legales` resolves against `tally.so`. Open it in a new tab — navigating away
  loses a half-filled form. If someone later "tidies" this to a relative path, it breaks
  silently.
- **Don't reduce it to nothing.** Art. 13 information is owed *at the point of collection*;
  a policy elsewhere on the site doesn't discharge it, and while the popup is open the
  footer link isn't even reachable. Same principle as `PRIVACY-PLAN.md`'s note on the
  storefront phone: say it where they type it.
- Retention (3 ans), the enumerated rights and the contact address now live on the page —
  don't restore them to the form.
- **No consent checkbox**, unchanged. Submitting a form headed *"Rejoignez les premiers
  traiteurs"* is unambiguous, and B2B prospecting needs no prior opt-in in France. A
  newsletter would be a new purpose needing its own opt-in.

3 ans = CNIL retention for prospection, counted from last contact.

### 3. Mentions légales + politique de confidentialité — done

`/mentions-legales`, two headings, linked from the footer.

| | Law | Trigger |
|---|---|---|
| Mentions légales | LCEN 2004-575 art. 6-III | Every French site, data or not |
| Politique de confidentialité | RGPD art. 13 | Already triggered by the Tally form |

Éditeur: William Alexander, micro-entreprise, 95 avenue de Verdun 93230 Romainville,
SIREN 794 431 874, no RCS, TVA FR 08 794 431 874. Hébergeur: Render Services, Inc.,
525 Brannan Street Suite 300, San Francisco CA 94107.

- **Téléphone deliberately omitted.** LCEN expects a contact phone number; the owner
  chose to publish only the email and accept the risk. Not an oversight — don't "fix" it.
- **VAT-registered**, so `15 € HT` in `index.astro` is correct as written.
- **Render is a US company**, so the privacy section says plainly that connection data
  (IP) is processed outside the EU for page delivery. Only the *form responses* are
  claimed to stay in the EU — that's Tally, Belgium. Don't restore the blanket
  "aucune donnée ne quitte l'UE" line; it was wrong once the host was named.

Privacy section also discloses that the Tally embed script on the home page sends the
visitor's IP to Tally on load, form or no form.

Render's coordinates came from a Google AI summary, not Render's own legal page — worth
one confirmation against render.com before this matters.

### 4. Self-host the two fonts — done

`public/fonts/`, six `woff2` files, `@font-face` in `Base.astro`; the Google Fonts
stylesheet and both `preconnect`s are gone, so no visitor IP reaches Google before
consent (LG München 2022 went against exactly that). Provenance and refresh recipe in
`apps/website/README.md`.

### 5. Vendor dashboard screenshots

Two only: `/dashboard/catalogue` and `/dashboard/markets`, both populated (5–6 dishes **with photos**, 3–4 markets). Skip forms, onboarding, dashboard home — forms don't sell.

Capture: same demo account as the storefront shot so names match; ~1200px wide; no browser chrome; check no real email is in frame. Login can't be automated (credentials), but an already-authenticated tab can be driven.

**Decision: capture, then hold.** The hero storefront shot does the selling. Dashboard shots lengthen the page and go stale every time that UI changes. Ship them only if pilot conversations stall on *"is this a hassle to maintain?"*

## Deferred

| Item | Add when |
|------|----------|
| Pilot price freeze | Owner decides he means it — it's the only genuine commercial commitment that would be on the page, which is why it's pinned rather than shipped. Draft, for the pilot terms: *Le tarif du pilote ne bouge pas — ce que nous ajouterons ensuite est compris.* Turns the roadmap from a threat ("will this get expensive?") into a reason to join now. |
| A 50 € tier (préco + réservation) | **Deliberately not on the page**, and not just "later". It turns the reassurance block into a pricing table, and a vendor reads *the good stuff costs 50, 15 buys the brochure* — at the exact moment you're asking for trust. Feature gating is still an Open Item in `MARKET_MIAM.md`, so publishing a split would commit in public to something undecided. And preordering is unscoped: no aggregate, no events, and it drags in payments, no-shows and customer PII the product currently avoids by design. |
| Analytics | Real traffic worth measuring. Needs a cookie banner if it sets cookies. |
| Client testimonial + real storefront shots | First *vendor* is actually live — the demo doesn't count. |
| Second page | One page stops being enough |
| Build-time image optimisation | Several images. `astro:assets` currently fails: optimised output lands in `dist/apps/website/_astro/` but is read from `apps/website/.astro/_astro/` — the out-of-tree `outDir` in `astro.config.mjs`. Fixing `cacheDir` would pay for itself at that point. |

## Decisions (don't re-litigate)

- **Slogan is "l'adresse de votre stand"** — `<title>` + footer. Old *"votre étal, en ligne"* implied e-commerce, which is what this deliberately isn't (no marketplace, no commission). *Étal* also reads as butcher/fishmonger display; *stand* is what the demo storefront already says.
- **Vocabulary is the product's, not the web's** — vitrine, carte, plats, traiteur. *Carte* = the standing list, *menu* = the day's. Matches the vendor app and the customer storefront, so a vendor meets the same words before and after signing up.
- **In-page CTAs match the Tally form title**; the header one doesn't, because it's navigation rather than the ask.
- **Demo link is a text link under the shot, not a second button** — the page converts to the pilot, and a second button competes.
- **The miam is on the roadmap although nothing is built** — namesake, and the only customer-side item. Roadmap, not promise; the section says so in its own lede.
- **`--mm-brand` for decoration, `--mm-brand-deep` for brand-as-text on light.** Measured on the roadmap list: `--mm-brand` is 3.90:1 against that section's background at 16px, under the 4.5:1 AA floor; `--mm-brand-deep` is 7.75:1. The file already followed this split (`.eyebrow`, `.foot a`, `.legal a`) — now it's written down.
- **Tally over Formspree** — unlimited responses free, and Belgium-based, so French vendors' data stays in the EU. Free tier shows Tally branding; Pro (€20/mo) removes it, not needed yet.
- **Popup, not inline iframe** — page stays on-brand, branding is less visible in an overlay.
- **Price named before it's charged** — *gratuit … puis 15 € HT/mois*. Stating it now avoids a cold ask at conversion and filters people who were never customers.
- **Storefront shot in the hero, not the dashboard** — it's what a vendor is buying.
- **"Market Miam" appears in one on-page heading** — the *Disponible aujourd'hui* h2, *Ce que Market Miam vous donne dès l'inscription*. Before that, the name was in `<title>`, metas, alt text and body copy but in no `h1`–`h6` on the whole site — a weak signal for brand queries. The hero h1 stays a brand-free hook; that section is the natural home because it's literally what Market Miam gives you.
- **`public/` holds generated assets, not originals.** Regeneration recipe in the app README.

## Astro traps hit here (save the next person the debugging)

- **`set:html` content escapes scoped CSS.** Astro compiles a scoped `.next strong` to
  `strong[data-astro-cid-…]`, and an element injected via `set:html` never carries that
  attribute — so the rule silently doesn't match. Worse, `<strong>` still *looks* right
  because the UA stylesheet makes it bold, so a colour that never applied reads as working.
  Use `.next :global(strong)`; the ancestor keeps the scope, so it stays contained.
- **Inline markup inside a flex `<li>` needs a wrapper.** `.next li` is `display: flex` with
  `gap: 0.7rem` for the `→`. A bare `<strong>` in the text becomes its own flex item and
  opens that gap mid-sentence. Wrap the entry in a `<span>` so it stays one item.
- **French guillemets need a literal U+00A0**, not `&nbsp;`. The roadmap entries are JS
  strings interpolated as text, so an HTML entity renders verbatim. (`6&nbsp;h` elsewhere is
  fine because that one really is markup.)

## Doc drift to fix elsewhere

*(2026-08-02: `MARKET_MIAM.md` was refreshed — the superseded brought/left post-market model is corrected there.)*

- `docs/MARKET_MIAM.md` lists *pricing tiers and feature gating* as an Open Item. It blocks the 50 € tier above, and it's the reason that tier stays off the page.
- Trademark: INPI check clear, registration requested 2026-08, confirmation pending (`docs/MARKET_MIAM.md`).
