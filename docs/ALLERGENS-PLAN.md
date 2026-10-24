# Allergens — plan

Every dish declares which of the 14 major allergens it contains, and the storefront shows them.
`ORDERING-PLAN.md` step 3 asks for this before ordering. Planned 2026-10-13.

## Why now

- INCO 1169/2011 art. 44 and décret 2015-447: for non-prepacked food, allergens are owed in writing at
  the point of sale. Vendors owe this at the stall today.
- Art. 14: once a dish is sold at a distance, the same information must be available **before the
  purchase is concluded**, at no cost. Ordering is that sale. ADR 0054 deferred allergens on the page
  "until a sale is concluded there".
- Shown before any online sale, it is voluntary, so shipping ahead of ordering carries no risk. The
  catalogue is filled in by the time ordering ships.

## Decisions

| # | Decision | Why |
|---|---|---|
| 1 | **Per item, not per variant.** One set covers every variant | Over-declaring a variant is safe; under-declaring is the danger. One checklist in the form |
| 2 | **Carried on `ItemAddedToCatalogue` and `ItemRevised`**, as `allergens: string[]` | The item form is saved whole: one command, one event. No second save path |
| 3 | **Required on add and revise.** `[]` is an explicit "none of the 14" | A declared "none" is a claim; silence is not. The form makes the vendor choose |
| 4 | **Undeclared is a state.** Events from before this plan have no `allergens` field, so their items stay undeclared until next revised | No upcast and no migration of events. Undeclared ≠ none |
| 5 | **Codes, not labels**, in events and payloads: the 14 Annex II entries as stable English keys | Labels are French UI copy and may be reworded; the event must not change with them |
| 6 | **Ships ahead of ordering** | Catalogue ready on day one of ordering; customers get the information now |
| 7 | **Ordering refuses undeclared items** (recorded here, built in ordering) | Art. 14 before purchase; an undeclared dish has nothing to show |

## The 14 (Annex II)

| Code | Label |
|---|---|
| `gluten` | Céréales contenant du gluten |
| `crustaceans` | Crustacés |
| `eggs` | Œufs |
| `fish` | Poissons |
| `peanuts` | Arachides |
| `soybeans` | Soja |
| `milk` | Lait |
| `nuts` | Fruits à coque |
| `celery` | Céleri |
| `mustard` | Moutarde |
| `sesame` | Graines de sésame |
| `sulphites` | Anhydride sulfureux et sulfites (plus de 10 mg/kg) |
| `lupin` | Lupin |
| `molluscs` | Mollusques |

## Slices

| # | Slice | Status |
|---|---|---|
| 1 | Domain, read model + HTTP: `Allergens` on add and revise, through to both APIs | done (`4a743a5`) |
| 2 | Vendor app: checklist in the item form, undeclared items flagged | done (`ea5179b`) |
| 3 | Storefront: allergens in the item sheet | done (`893d3f9`) |
| 4 | Rollout: ask the live client to declare every dish | 1–3 deployed; the client's part is open |

### 1. Domain, read model + HTTP — shipped (`4a743a5`)

Built as one slice, outside-in from the API spec: once the commands require `allergens`, the
controller must require it in the body in the same change. Defaulting it to `[]` there would declare
"none of the 14" for every dish saved without a choice. The dev seed declares its demo dishes.

Domain:

- `Allergens` value object: a set of codes from the 14. Rejects an unknown code (`DomainError`),
  dedupes, keeps a stable order. Empty is valid.
- `AddItemToCatalogue` and `ReviseItem` require `allergens`. Events carry `allergens` (optional in
  the event type, for old events).
- `Item` holds undeclared or declared. `isDescribedAs` compares allergens too, so an unchanged
  revision still appends nothing, and a revision that only declares allergens appends `ItemRevised`.
- Item identifiers stay `Item` in code (dish in prose).

Read model + HTTP:

- Migration 0023: `catalogue_view_items.allergens jsonb`, `NULL` = undeclared. Existing rows are
  already correct, so no rebuild.
- `CatalogueViewItem.allergens: string[] | null`. The projection writes it on add and on revise.
- `POST /catalogue` and `PUT /catalogue/:itemId` bodies require `allergens: string[]` (zod: shape only; the value object
  owns the codes, ADR 0046). `GET /catalogue` returns it.
- The public storefront's items and market-day menus carry it, since both come from the catalogue view.

### 2. Vendor app — shipped (`ea5179b`)

- Add and revise forms: a checklist of the 14, plus an explicit "Aucun de ces 14 allergènes".
  Ticking it clears the others, and ticking any allergen clears it. Saving is blocked until one or
  the other is chosen, with a reason in the blockers list (as on the other forms).
- Catalogue list: an undeclared item says "Allergènes à renseigner", so the live client's existing
  dishes are easy to find.
- Labels live in the frontend, keyed by code (`catalogue/allergens.ts`).
- Unticking the last allergen goes back to undeclared, so "none" is only ever the explicit box.

### 3. Storefront — shipped (`893d3f9`)

- Item sheet, under an "Allergènes" heading: the names in Annex II order ("céleri, lait"), or
  "Aucun des 14 allergènes majeurs", or, undeclared, "Renseignez-vous auprès du traiteur". The view
  model builds the line, so the carte and the market-day menu read one rule.
- Cards stay as they are; the sheet is where a dish's detail lives.

### 4. Rollout

1–3 were pushed together on 2026-10-13 (`ca48559`, CI green, so deployed per `render.yaml`).
Slice 1 could not go alone: once it requires `allergens`, the vendor app cannot save a dish until
slice 2.

What remains: ask the live client to declare every dish. The catalogue flags those left.

## Not in this plan

- "Peut contenir des traces" (precautionary labelling): voluntary, not asked for.
- Allergen icons on cards or filtering by allergen.
- Other mandatory particulars for distance sale of non-prepacked food. My reading is that art. 44 and
  décret 2015-447 ask for allergens only; confirm with the lawyer alongside the ordering questions.
- Ordering's refusal of undeclared items (decision 7) lands with ordering.

## Open

- Storefront wording, especially the undeclared line, to the lawyer with the ordering batch.
- The label map lives in both frontends. Two copies of one table; move it to a shared package if a
  third consumer appears.
