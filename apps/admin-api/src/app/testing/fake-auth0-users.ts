import { Auth0Account, Auth0Users } from '../auth0/auth0-users';

export class FakeAuth0Users extends Auth0Users {
  constructor(private readonly accounts: Auth0Account[] = []) {
    super();
  }

  all(): Promise<Auth0Account[]> {
    return Promise.resolve(this.accounts);
  }
}
