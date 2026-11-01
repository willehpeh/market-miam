// Someone who runs Market Miam, signed in to the admin app. operatorId is their Auth0
// user id (`sub`), such as `github|1234567`.
export interface VerifiedOperator {
  readonly operatorId: string;
}
