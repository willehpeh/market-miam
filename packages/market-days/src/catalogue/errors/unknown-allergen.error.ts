import { DomainError } from '@market-miam/common';

export class UnknownAllergenError extends DomainError {
  constructor(allergen: string) {
    super(`Not one of the 14 allergens of INCO 1169/2011: ${allergen}`);
  }
}
