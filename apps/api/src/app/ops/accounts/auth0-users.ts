import { Auth0ManagementApi } from './auth0-management-api';

// A user as the Management API returns it, as far as Market Miam reads one.
export interface Auth0User {
  email?: string;
  app_metadata?: { vendorId?: string };
}

export interface NewAuth0User {
  connection: string;
  email: string;
  app_metadata: { vendorId: string };
  // Auth0 emails a passwordless user it creates a sign-in link unless this is true.
  email_verified: boolean;
}

// What asking Auth0 to create a user came to, short of a failure.
export type UserCreation = 'created' | 'already-exists' | 'address-refused';

// Auth0 refusing a request for a reason Market Miam cannot act on. Thrown, so its caller fails
// loudly and a processor's subscription retries. It carries the status and Auth0's error code,
// never Auth0's message, which can name the address.
export class Auth0Refusal extends Error {
  constructor(what: string, readonly status: number, errorCode?: string) {
    super(`Auth0 refused to ${what}: ${[status, errorCode].filter(Boolean).join(' ')}`);
  }
}

const BAD_REQUEST = 400;
const CONFLICT = 409;

interface ErrorBody {
  errorCode?: string;
  message?: string;
}

// The tenant's users, through its Management API: the HTTP is all here, so the adapters
// only translate what these methods answer into their ports' terms.
export class Auth0Users {
  constructor(private readonly api: Auth0ManagementApi) {}

  async create(user: NewAuth0User): Promise<UserCreation> {
    const response = await this.api.fetch('api/v2/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (response.ok) {
      return 'created';
    }
    if (response.status === CONFLICT) {
      return 'already-exists';
    }
    const error = await errorBodyOf(response);
    if (response.status === BAD_REQUEST && refusesTheAddress(error)) {
      return 'address-refused';
    }
    throw new Auth0Refusal('create a user', response.status, error.errorCode);
  }

  async withEmail(email: string): Promise<Auth0User[]> {
    return this.read(`api/v2/users-by-email?${new URLSearchParams({ email })}`, 'say who holds an address');
  }

  async page(page: number, perPage: number): Promise<Auth0User[]> {
    const query = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
      fields: 'email,app_metadata',
      include_fields: 'true',
    });
    return this.read(`api/v2/users?${query}`, 'list users');
  }

  private async read<T>(path: string, what: string): Promise<T> {
    const response = await this.api.fetch(path);
    if (!response.ok) {
      throw new Auth0Refusal(what, response.status);
    }
    return (await response.json()) as T;
  }
}

// Auth0 answers errors in JSON, but whatever stands in front of it may not.
async function errorBodyOf(response: Response): Promise<ErrorBody> {
  return response.json().catch(() => ({}));
}

// Auth0's payload validation failing on the email property, and only that: any other 400 may
// be a fault of ours, better thrown and retried than taken for a refused address.
function refusesTheAddress({ errorCode, message }: ErrorBody): boolean {
  return errorCode === 'invalid_body' && / on property email\b/.test(message ?? '');
}
