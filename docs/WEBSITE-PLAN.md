# Website — Status & Remaining Work

`apps/website` (Astro, static) at `marketmiam.fr` / `www.`. Purpose: convert traiteurs into paying vendors, onboarded by hand, not self-serve signup. Sells what ships today and names what doesn't. *(Was: convert vendors into the pilot, 5–10 hand-onboarded traiteurs. The pilot is gone: `CGU-CGV-PLAN.md` decision 13.)*

## Holding page (2026-10-04)

The live client and every prospect said Market Miam is unusable until customers can order and pay through it. The page now carries only the hero, one line naming online ordering as coming (*Bientôt, la commande en ligne*), the Tally button and the footer. Gone: the problem band, the *Comment fonctionne Market Miam* groups with their two app screens, the pilot terms, the price and the *ce qui sera ajouté plus tard est compris* freeze. The live client co-designed the pricing, so nothing public was owed. Rebuilt around ordering once it ships. `app-pendant-le-marche.webp` and `app-reperes.webp` stay in `public/` for that rebuild.

Kept up: `/mentions-legales#licence` is the vendor app's AGPL source link (`apps/vendor-frontend/src/app/core/layout.ts`), policy A lives at `/confidentialite-traiteurs` (`MENTIONS-LEGALES-PLAN.md` slice 6), and the Tally form is the only way in for prospects.

Since 2026-10-25 every CTA, header included, reads *Ouvrons votre vitrine*. The one live client is not yet invoiced, and the first-paid-plan trigger has not fired.

## Shipped (`d1eef8c` … `64ab3a4`)

Single page, French, plain CSS over `packages/design-system/tokens.css`.

- Hero → problem → *Ce que Market Miam vous donne*, in three groups by what each thing costs the vendor (**Une fois pour toutes**: vitrine, carte, marchés · **À chaque marché**: menu du jour, pendant, après · **Au fil des marchés**: ce qui part et ce qui reste) → pilot terms → footer
- Tally popup lead capture, form `aQX9NB` (nom / adresse mail / marchés où vous exercez)
- `og:*` + `twitter:*` + canonical in `Base.astro`; `og.jpg` 1200×630
- SEO plumbing: `site` in `astro.config.mjs` holds the origin, `Base.astro` builds URLs from `Astro.site`; `@astrojs/sitemap` + `public/robots.txt`; JSON-LD `Organization` + `WebSite`. Keyword coverage is content pages' job, still open
- Demo storefront link (`d7afdff`): `demo.marketmiam.fr` is a **real published storefront in production**, unrelated to `apps/api/src/app/dev-seed.ts` (`NODE_ENV=development` only). `<figcaption>` link, new tab + `rel="noopener"`
- CTAs (`55073a6`, `d233015`): in-page CTAs *Rejoignez les premiers traiteurs* (the form's title), header *Rejoindre le pilote* (navigation). **Superseded 2026-10-25:** every CTA reads *Ouvrons votre vitrine*, and the page no longer names the pilot anywhere
- Roadmap section (`f32ace5`, `a49c622`, `64ab3a4`): deleted when the MVP completed (repères shipped, `BILAN-RETROSPECTIVE-PLAN.md` slice 1; miam deferred with no date). Not a plan to restore
- Hero premise corrected: neither Instagram stories nor cross-market discovery; *Vos marchés* now sells which days you are at **their** local market
- Features grouped by what they cost the vendor; group headings `--mm-brand-deep` over a `--mm-line-strong` rule, lone last card tinted `--mm-brand-soft` (`--mm-ink-soft` on it: 6.05:1)
- Voice pass: em-dashes only in the slogan; no rhetorical questions, fragments or *not X but Y*; name the real thing (the app's pile labels); don't overclaim. `h1`: *Vos habitués savent quand vous venez, et ce que vous servez.*; features heading: *Comment fonctionne Market Miam*
- Meta description: *Traiteurs de marché : vos habitués savent quand vous venez et ce que vous servez, et vous voyez, marché par marché, quels plats partent et lesquels restent.* (156 chars). Changes restale `og:description` on shared links (§1)

### Vocabulary pass (`55073a6`)

The page spoke web and back-office; the product speaks traiteur.

| Was | Now | Why |
|---|---|---|
| catalogue | **carte** | `catalogue` is the `packages/market-days` aggregate name; the storefront says *Notre carte*. |
| une page | **vitrine** | The vendor app says *Ma vitrine* / *Créer ma vitrine*; the storefront footer signs *Vitrine mijotée par Market Miam*. |
| page vendeur (alt text) | vitrine | *vendeur* is the `Vendor` aggregate; public-facing it's *traiteur*. |
| vous jetez | invendus | The trade word. |
| quoi apporter | quoi préparer la veille | Names when the decision is made. |
| place de marché | plateforme | Collides with the **place du marché** vendors work on. |

**carte vs menu.** *Carte* is the standing list (the catalogue), *menu* is the day's offering (the market day): *Le menu du jour*, never *carte du jour*. The hero alt text says *sa carte* because the screenshot shows the standing carte, stale since live-mode slice 0 moved the carte to `/carte` (§7). Reshoot before touching the alt text.

## Remaining

### 1. Post-deploy verification (blocking, do first)

- Load on a phone: checked at 390px in headless Chromium against `dist/`; a real device is still worth one look (tap targets, iOS font fallback, Tally overlay).
- Click a CTA on the real domain: **still unverified**; only confirmed against `localhost`, and the agent proxy denies `tally.so` (403 to CONNECT). **Checking the form's title, fields and consent copy is a human step**; paste the text into a session to review against §2.
- Click the demo link on the real domain: **still unverified.** The agent proxy 403s `demo.marketmiam.fr`.
- Paste the URL into WhatsApp: confirms `/og.jpg` is reachable and the card renders.

Scraper caches are sticky: shared links keep showing *catalogue* until a forced re-scrape, and regenerating `og.jpg` later needs a forced re-scrape or a new filename.

### 2. Tally consent text (open)

A **layered notice** (CNIL *information à deux niveaux*): first layer on the form, the rest on `/mentions-legales` (§3).

Under *Adresse mail*, keep as-is:

> Votre adresse ne servira qu'à vous recontacter au sujet de la phase pilote. Pas de newsletter, pas de partage avec des tiers.

Above *Envoyer*:

> Vos réponses servent uniquement à vous recontacter au sujet de la phase pilote. Ni revendues, ni transmises à des tiers. Conservation, vos droits et comment les exercer : https://marketmiam.fr/mentions-legales

**Both blocks are the pre-2026-09 wording and name the *phase pilote*.** The owner renamed the form *Ouvrons votre vitrine* in September 2026, and `/mentions-legales` stopped naming the pilot on 2026-10-24 (§3). **Left to do:** read the form's current copy (§1) and confirm its stated purpose matches `/mentions-legales` (Art. 13 information). Rules:

- **The URL must be absolute**: the form renders in Tally's overlay, so a relative path resolves against `tally.so`. Open in a new tab.
- **Don't reduce it to nothing**: Art. 13 information is owed at the point of collection; the footer link is unreachable while the popup is open.
- Retention (3 ans, CNIL prospection, from last contact), rights and contact address live on the page, not the form.
- **No consent checkbox**: B2B prospecting needs no prior opt-in in France. A newsletter would.

### 3. Mentions légales + politique de confidentialité — done

`/mentions-legales`, linked from the footer: mentions légales (LCEN 2004-575 art. 6-III, every French site) and politique de confidentialité (RGPD art. 13, triggered by the Tally form).

Éditeur: William Alexander, micro-entreprise, 95 avenue de Verdun 93230 Romainville, SIREN 794 431 874, no RCS, TVA FR 08 794 431 874. Hébergeur: Render Services, Inc., 525 Brannan Street Suite 300, San Francisco CA 94107.

- **Téléphone omitted.** The owner chose email only and accepts the risk. Don't "fix" it.
- **VAT-registered**, so `15 € HT` in `index.astro` was correct as written.
- **Render is a US company**: connection data (IP) is processed outside the EU; only form responses stay in the EU (Tally, Belgium). Don't restore the blanket "aucune donnée ne quitte l'UE" line.
- The Tally embed script sends the visitor's IP to Tally on load, form or no form; disclosed.
- Render's coordinates came from a Google AI summary; confirm against render.com.

**Restated 2026-10-24: the pilot is gone from the privacy section.** *le formulaire de candidature à la phase pilote* and *vous recontacter au sujet de la phase pilote* became *le formulaire de contact* and *vous recontacter au sujet de Market Miam*. The form's own consent copy is still unchecked (§2).

### 4. Self-host the two fonts — done

Six `woff2` files with `@font-face`; the Google Fonts stylesheet and both `preconnect`s are gone, so no visitor IP reaches Google before consent (LG München 2022). **Moved 2026-09 into `packages/design-system`** (ADR 0054). The site imports `fonts.css` from `Base.astro`'s frontmatter and keeps no `public/fonts/`; recipe in `packages/design-system/README.md`.

### 5. Vendor dashboard screenshots — done

**Superseded 2026-09: two vendor-app screens are on the page**: the live market screen (*En direct*, a dish under *Épuisés*, *Fermer le stand*) beside *À chaque marché*, the menu editor with its sales labels beside *Au fil des marchés*. *Une fois pour toutes* gets no screen (forms).

Replacement rules: phone screenshots from the demo account, no dish photos or real email in frame, full phone width with the app's own background (no dark bezel, not cropped to the white card), hero-shot border, radius, shadow and a caption; recipe in the app README. They carry a date (*Mardi 29 septembre*); reshoot if the screens change.

### 6. The close clause — done

On the *Pendant le marché* card since slice 2 (reworded in the voice pass, same two doors):

> Et quand vous remballez — ou si vous ne pouvez pas venir — vous fermez le stand : votre
> vitrine cesse d'annoncer un marché où vous n'êtes plus.

It carries both doors of decision 45 (*Fermer le stand*, *Je ne peux pas venir aujourd'hui*) without naming either label. Slice 2b landed with it as the *Après le marché* card: the bilan is **one form submitted whole**, not *un geste par plat* (live-mode decision 72), and dishes marked épuisé **arrive already ticked** (decision 49).

**Prix par marché is shipped and not on the page.** Add to *Votre carte* if a conversation turns on it.

### 7. Reshoot the hero storefront (`storefront-demo.webp`) — open

Stale since slice 0. Shoot on a live market morning so the frame carries *Prochain marché* with the day's menu, at least one **Épuisé** row and the *Notre carte* entry. Alt text becomes *…photo de stand, nom du traiteur et le menu du jour*; `og.jpg` is composed from the same shot, so it regenerates too, hence a forced re-scrape (§1).

## Deferred

- ~~Pilot price freeze~~: **shipped 2026-08**, alongside the price.
- ~~A 50 € tier (préco + réservation)~~: **superseded 2026-10-24, there are no tiers.** One package at 50 € HT/month, ordering included; the 15 € price is dropped. Named when the page is rebuilt around ordering.
- Analytics: real traffic worth measuring. Needs a cookie banner if it sets cookies.
- Client testimonial + real storefront shots: when the first *vendor* is live (the demo doesn't count). **Each asset needs that vendor's written permission** (`CGU-CGV-PLAN.md` decision 9), the §5 shots too.
- Second page: when one stops being enough.
- Build-time image optimisation: several images. `astro:assets` fails: output lands in `dist/apps/website/_astro/` but is read from `apps/website/.astro/_astro/` (out-of-tree `outDir`); fix `cacheDir` then.

## Decisions (don't re-litigate)

- **Slogan is "l'adresse de votre stand"**, in `<title>` + footer. *"votre étal, en ligne"* implied e-commerce.
- **Vocabulary is the product's**: vitrine, carte, plats, traiteur. *Carte* = the standing list, *menu* = the day's.
- **In-page CTAs match the Tally form title.** Since 2026-10-25 the header matches too.
- **Demo link is a text link under the shot, not a second button.**
- ~~**The miam is on the roadmap although nothing is built**~~ — superseded 2026-08: off the page with the roadmap. The site no longer explains its own name.
- **`--mm-brand` for decoration, `--mm-brand-deep` for brand-as-text on light.** `--mm-brand` measured 3.90:1 at 16px, under the 4.5:1 AA floor; `--mm-brand-deep` is 7.75:1.
- **Tally over Formspree.** Free, unlimited, Belgium-based; Pro (€20/mo) removes the branding, not needed yet.
- **Popup, not inline iframe.**
- **Price named before it's charged.** The holding page names no price (2026-10-25).
- ~~**The pilot ends when the roadmap features ship.**~~ Superseded 2026-08 by 15 € HT/mois, first month offered (*Premier mois offert. Sans engagement.*); removed with the pilot (`CGU-CGV-PLAN.md` decision 13).
- **The price freeze ships with the price**: *Le tarif ne bouge pas — ce qui arrive ensuite est compris, sans supplément.* Withdrawn (`CGU-CGV-PLAN.md` decision 6); off the site since the 2026-10-04 holding page.
- **No billing system.** ADR 0048 settles the architecture; `packages/billing` does not exist. The one live client is not yet invoiced (2026-10-25); invoicing will be by hand from the micro-entreprise, non-payment handled by unpublishing by hand. `NEXT_BEHAVIOURS.md`'s *subscription as a publication requirement* triggers on the first paid plan, not yet fired.
- **HT and TTC are both shown**: *15 € HT par mois (18 € TTC)*; a traiteur en franchise de TVA cannot reclaim the 20 %. Becomes *50 € HT par mois (60 € TTC)* when rebuilt around ordering (price of 2026-10-24).
- **Storefront shot in the hero, not the dashboard.**
- **"Market Miam" appears in one on-page heading**: *Ce que Market Miam vous donne*, since reworded to *Comment fonctionne Market Miam*.
- **`public/` holds generated assets, not originals.** Recipe in the app README.

## Astro traps hit here

- **`set:html` content escapes scoped CSS.** Scoped `.next strong` compiles to `strong[data-astro-cid-…]`; injected elements lack it, so the rule silently fails while `<strong>` still looks bold. Use `.next :global(strong)`.
- **Inline markup inside a flex `<li>` needs a wrapper.** A bare `<strong>` becomes its own flex item and opens the `gap` mid-sentence. Wrap the entry in a `<span>`.
- **French guillemets need a literal U+00A0**, not `&nbsp;`, in JS strings interpolated as text.
- Assets in `public/` are generated; provenance and the regeneration recipe are in `apps/website/README.md`.

## Doc drift to fix elsewhere

- Trademark: INPI check clear, registration requested 2026-08, confirmation pending (`docs/MARKET_MIAM.md`).
