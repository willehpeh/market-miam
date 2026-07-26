# Website — Status & Remaining Work

`apps/website` (Astro, static) at `marketmiam.fr` / `www.`. Purpose: convert vendors into the pilot — 5–10 hand-onboarded traiteurs, not self-serve signup. Sells what ships today; names what doesn't.

## Shipped (`d1eef8c`)

Single page, French, plain CSS over `packages/design-system/tokens.css`.

- Hero → problem → *Disponible aujourd'hui* (storefront, catalogue, marchés) → *Ce qui arrive ensuite* → pilot terms → footer
- Tally popup lead capture, form `aQX9NB` (nom / adresse mail / marchés où vous exercez)
- `og:*` + `twitter:*` + canonical in `Base.astro`; `og.jpg` 1200×630
- Assets in `public/` are generated — provenance and regeneration recipe in `apps/website/README.md`

## Remaining

### 1. Post-deploy verification (blocking, do first)

| Check | Why |
|-------|-----|
| Load on a phone | **Mobile layout is unverified** — Chrome refused to resize below its minimum width, so it was never seen narrow. CSS is single-column with `clamp()` type and an auto-fit grid, so it should hold. |
| Click a CTA on the real domain | Tally popup was only confirmed against `localhost` |
| Paste URL into WhatsApp | First moment `/og.jpg` is reachable; confirms the card renders |

Scraper caches are sticky: regenerating `og.jpg` after the link is shared needs a forced re-scrape or a new filename.

### 2. Tally consent text

RGPD Art. 13 obligation started when the form went live. Paste into Tally — field description, then a Text block above submit.

Under *Adresse mail*:

> Votre adresse ne servira qu'à vous recontacter au sujet de la phase pilote. Pas de newsletter, pas de partage avec des tiers.

Above *Envoyer*:

> Les informations recueillies sont utilisées par Market Miam dans le seul but de vous recontacter au sujet de la phase pilote. Elles ne sont ni revendues ni transmises à des tiers, et sont conservées jusqu'à votre demande de suppression, et au plus tard 3 ans après notre dernier échange. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression : écrivez à contact@marketmiam.fr.

3 ans = CNIL retention for prospection, counted from last contact. No consent checkbox — submitting a form headed *"Rejoignez les premiers traiteurs"* is unambiguous consent, and B2B prospecting needs no prior opt-in in France. A newsletter would be a new purpose needing its own opt-in.

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
| Analytics | Real traffic worth measuring. Needs a cookie banner if it sets cookies. |
| Client testimonial + real storefront shots | First vendor is actually live |
| Second page | One page stops being enough |
| Build-time image optimisation | Several images. `astro:assets` currently fails: optimised output lands in `dist/apps/website/_astro/` but is read from `apps/website/.astro/_astro/` — the out-of-tree `outDir` in `astro.config.mjs`. Fixing `cacheDir` would pay for itself at that point. |

## Decisions (don't re-litigate)

- **Slogan is "l'adresse de votre stand"** — `<title>` + footer. Old *"votre étal, en ligne"* implied e-commerce, which is what this deliberately isn't (no marketplace, no commission). *Étal* also reads as butcher/fishmonger display; *stand* is what the demo storefront already says.
- **Tally over Formspree** — unlimited responses free, and Belgium-based, so French vendors' data stays in the EU. Free tier shows Tally branding; Pro (€20/mo) removes it, not needed yet.
- **Popup, not inline iframe** — page stays on-brand, branding is less visible in an overlay.
- **Price named before it's charged** — *gratuit … puis 15 € HT/mois*. Stating it now avoids a cold ask at conversion and filters people who were never customers.
- **Storefront shot in the hero, not the dashboard** — it's what a vendor is buying.
- **`public/` holds generated assets, not originals.** Regeneration recipe in the app README.

## Doc drift to fix elsewhere

- `docs/MARKET_MIAM.md` post-market tracking (*brought*/*left* quantities → derived sell-through and waste %) is superseded by three outcomes per dish per market day — did well / did not do well / sold out — folded into the menu du jour rather than a separate phase.
- INPI/EUIPO check on the "Market Miam" name still outstanding (`docs/MARKET_MIAM.md`).
