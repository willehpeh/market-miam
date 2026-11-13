import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

export interface Auth0User {
  connection?: string;
  email?: string;
  app_metadata?: { vendorId?: string };
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function bodyOf(req: IncomingMessage): Promise<string> {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body;
}

// Stands in for the Management API endpoints the adapters call, on a local port:
// client-credentials tokens, then the paged user list, user creation and the lookup by email,
// which want the latest token. Like Auth0, it refuses a second user with an email already on
// that connection, and the lookup answers whatever the connection.
export class FakeAuth0 {
  readonly tokenRequests: Record<string, string>[] = [];
  readonly userPages: URLSearchParams[] = [];
  users: Auth0User[] = [];
  tokenStatus = 200;
  usersStatus = 200;
  createStatus = 201;
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
    if (req.method === 'POST' && url.pathname === '/api/v2/users') {
      if (req.headers.authorization !== `Bearer ${this.latestToken()}`) {
        return send(res, 401, { error: 'invalid_token' });
      }
      if (this.createStatus !== 201) {
        return send(res, this.createStatus, { error: 'server_error' });
      }
      const user = JSON.parse(await bodyOf(req)) as Auth0User;
      if (this.users.some((held) => held.email === user.email && held.connection === user.connection)) {
        return send(res, 409, { statusCode: 409, error: 'Conflict', message: 'The user already exists.' });
      }
      this.users.push(user);
      return send(res, 201, user);
    }
    if (req.method === 'GET' && url.pathname === '/api/v2/users-by-email') {
      if (req.headers.authorization !== `Bearer ${this.latestToken()}`) {
        return send(res, 401, { error: 'invalid_token' });
      }
      const email = url.searchParams.get('email');
      return send(res, 200, this.users.filter((user) => user.email === email).map(asReturned));
    }
    send(res, 404, {});
  }

  private latestToken(): string {
    return `token-${this.tokenRequests.length}`;
  }
}

// A user as the Management API returns it, which has no top-level connection.
function asReturned({ email, app_metadata }: Auth0User) {
  return { email, ...(app_metadata && { app_metadata }) };
}
