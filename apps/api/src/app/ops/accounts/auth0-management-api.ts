const RENEW_BEFORE_EXPIRY_MS = 60_000;

interface Token {
  readonly value: string;
  readonly expiresAt: number;
}

interface Request {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string;
}

// The tenant's Management API, as a machine-to-machine client. Auth0 meters those clients'
// tokens, so one is kept until a minute before it expires, and calls started together share it.
export class Auth0ManagementApi {
  private token?: Promise<Token>;

  constructor(
    private readonly issuer: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly now: () => number = Date.now,
  ) {}

  async fetch(path: string, request: Request = {}): Promise<Response> {
    const token = await this.currentToken();
    return fetch(new URL(path, this.issuer), {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${token}` },
    });
  }

  private async currentToken(): Promise<string> {
    if (!this.token) {
      this.token = this.requestToken().catch((error: unknown) => {
        this.token = undefined;
        throw error;
      });
    }
    const token = await this.token;
    if (this.now() < token.expiresAt - RENEW_BEFORE_EXPIRY_MS) {
      return token.value;
    }
    this.token = undefined;
    return this.currentToken();
  }

  private async requestToken(): Promise<Token> {
    const requestedAt = this.now();
    const response = await fetch(new URL('oauth/token', this.issuer), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: new URL('api/v2/', this.issuer).href,
      }),
    });
    if (!response.ok) {
      throw new Error(`Auth0 refused the Management API token: ${response.status}`);
    }
    const { access_token, expires_in } = (await response.json()) as { access_token: string; expires_in: number };
    return { value: access_token, expiresAt: requestedAt + expires_in * 1000 };
  }
}
