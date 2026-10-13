// The 14 of INCO 1169/2011 Annex II, in the regulation's order, as the API codes them,
// worded for the middle of a sentence. The vendor app keeps the same table for its form.
const ALLERGENS: readonly { code: string; label: string }[] = [
  { code: 'gluten', label: 'céréales contenant du gluten' },
  { code: 'crustaceans', label: 'crustacés' },
  { code: 'eggs', label: 'œufs' },
  { code: 'fish', label: 'poissons' },
  { code: 'peanuts', label: 'arachides' },
  { code: 'soybeans', label: 'soja' },
  { code: 'milk', label: 'lait' },
  { code: 'nuts', label: 'fruits à coque' },
  { code: 'celery', label: 'céleri' },
  { code: 'mustard', label: 'moutarde' },
  { code: 'sesame', label: 'graines de sésame' },
  { code: 'sulphites', label: 'anhydride sulfureux et sulfites (plus de 10 mg/kg)' },
  { code: 'lupin', label: 'lupin' },
  { code: 'molluscs', label: 'mollusques' },
];

// Null is a dish added before allergens existed: undeclared, which must never read as "none".
export function allergensLine(allergens: string[] | null): string {
  if (allergens === null) {
    return 'Renseignez-vous auprès du traiteur';
  }
  if (allergens.length === 0) {
    return 'Aucun des 14 allergènes majeurs';
  }
  return ALLERGENS.filter((allergen) => allergens.includes(allergen.code)).map((allergen) => allergen.label).join(', ');
}
