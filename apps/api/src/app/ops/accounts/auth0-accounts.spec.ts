import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { Auth0Accounts } from './auth0-accounts';

interface Auth0User {
  email?: string;
  app_metadata?: { vendorId?: string };
}

const CLIENT_ID = 'management-client';
const CLIENT_SECRET = 'management-secret';

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function bodyOf(req: IncomingMessage): Promise<string> {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body;
}

// Stands in for the two Management API endpoints the adapter calls, on a local port:
// client-credentials tokens, and the paged user list, which wants the latest token.
class FakeAuth0 {
  readonly tokenRequests: Record<string, string>[] = [];
  readonly userPages: URLSearchParams[] = [];
  users: Auth0User[] = [];
  tokenStatus = 200;
  usersStatus = 200;
  expiresInSeconds = 86_400;
  private server!: Server;

  async start(): Promise<string> {
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/`;
  }

  stop(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://fake');
    if (req.method === 'POST' && url.pathname === '/oauth/token') {
      this.tokenRequests.push(JSON.parse(await bodyOf(req)));
      return this.tokenStatus === 200
        ? send(res, 200, { access_token: this.latestToken(), expires_in: this.expiresInSeconds, token_type: 'Bearer' })
        : send(res, this.tokenStatus, { error: 'access_denied' });
    }
    if (req.method === 'GET' && url.pathname === '/api/v2/users') {
      if (req.headers.authorization !== `Bearer ${this.latestToken()}`) {
        return send(res, 401, { error: 'invalid_token' });
      }
      this.userPages.push(url.searchParams);
      if (this.usersStatus !== 200) {
        return send(res, this.usersStatus, { error: 'insufficient_scope' });
      }
      const page = Number(url.searchParams.get('page'));
      const perPage = Number(url.searchParams.get('per_page'));
      return send(res, 200, this.users.slice(page * perPage, (page + 1) * perPage));
    }
    send(res, 404, {});
  }

  private latestToken(): string {
    return `token-${this.tokenRequests.length}`;
  }
}

describe('Auth0Accounts', () => {
  let auth0: FakeAuth0;
  let issuer: string;
  let now: number;

  const accounts = () => new Auth0Accounts(issuer, CLIENT_ID, CLIENT_SECRET, () => now);

  beforeEach(async () => {
    auth0 = new FakeAuth0();
    issuer = await auth0.start();
    now = 1_000_000;
  });

  afterEach(async () => {
    await auth0.stop();
  });

  it('lists every account with its vendor id, page by page', async () => {
    auth0.users = Array.from({ length: 150 }, (_, i) => ({
      email: `vendor${i}@x.test`,
      app_metadata: { vendorId: `vendor-${i}` },
    }));

    const listed = await accounts().all();

    expect(listed).toHaveLength(150);
    expect(listed[149]).toEqual({ email: 'vendor149@x.test', vendorId: 'vendor-149' });
    expect(auth0.userPages.map((page) => page.get('page'))).toEqual(['0', '1']);
    expect(auth0.userPages[0].get('fields')).toBe('email,app_metadata');
  });

  it('gives null for an account without an email or a vendor id', async () => {
    auth0.users = [{}];

    expect(await accounts().all()).toEqual([{ email: null, vendorId: null }]);
  });

  it('asks Auth0 for a Management API token with its client credentials', async () => {
    await accounts().all();

    expect(auth0.tokenRequests).toEqual([
      {
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        audience: `${issuer}api/v2/`,
      },
    ]);
  });

  it('reuses its token while it is valid, even for lists started together', async () => {
    const directory = accounts();

    await Promise.all([directory.all(), directory.all()]);
    await directory.all();

    expect(auth0.tokenRequests).toHaveLength(1);
  });

  it('asks for a new token a minute before the current one expires', async () => {
    auth0.expiresInSeconds = 3600;
    const directory = accounts();
    await directory.all();

    now += 3600 * 1000 - 59_000;
    await directory.all();

    expect(auth0.tokenRequests).toHaveLength(2);
  });

  it('fails without leaking the secret when Auth0 refuses the credentials', async () => {
    auth0.tokenStatus = 401;

    const failure = accounts().all();

    await expect(failure).rejects.toThrow(/401/);
    await expect(failure).rejects.not.toThrow(new RegExp(CLIENT_SECRET));
  });

  it('asks for a fresh token after a refused one, rather than keeping the failure', async () => {
    auth0.tokenStatus = 401;
    const directory = accounts();
    await expect(directory.all()).rejects.toThrow();

    auth0.tokenStatus = 200;

    await expect(directory.all()).resolves.toEqual([]);
  });

  it('fails when Auth0 refuses the user list', async () => {
    auth0.usersStatus = 403;

    await expect(accounts().all()).rejects.toThrow(/403/);
  });
});
