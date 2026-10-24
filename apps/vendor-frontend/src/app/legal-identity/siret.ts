// The form's copy of the Siret value object's rule, so a typo is caught before the registry
// lookup and before the save. The API stays the authority (ADR 0046).
export function isSiret(input: string): boolean {
  const digits = input.replace(/\s/g, '');
  if (!/^\d{14}$/.test(digits)) {
    return false;
  }
  const sum = [...digits].reverse().reduce((total, char, index) => {
    const doubled = index % 2 === 1 ? Number(char) * 2 : Number(char);
    return total + (doubled > 9 ? doubled - 9 : doubled);
  }, 0);
  return sum % 10 === 0;
}
