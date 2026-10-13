// The 14 of INCO 1169/2011 Annex II, in the regulation's order, as the API codes them.
// The labels are the annex's own French names.
export const ALLERGENS: readonly { code: string; label: string }[] = [
  { code: 'gluten', label: 'Céréales contenant du gluten' },
  { code: 'crustaceans', label: 'Crustacés' },
  { code: 'eggs', label: 'Œufs' },
  { code: 'fish', label: 'Poissons' },
  { code: 'peanuts', label: 'Arachides' },
  { code: 'soybeans', label: 'Soja' },
  { code: 'milk', label: 'Lait' },
  { code: 'nuts', label: 'Fruits à coque' },
  { code: 'celery', label: 'Céleri' },
  { code: 'mustard', label: 'Moutarde' },
  { code: 'sesame', label: 'Graines de sésame' },
  { code: 'sulphites', label: 'Anhydride sulfureux et sulfites (plus de 10 mg/kg)' },
  { code: 'lupin', label: 'Lupin' },
  { code: 'molluscs', label: 'Mollusques' },
];
