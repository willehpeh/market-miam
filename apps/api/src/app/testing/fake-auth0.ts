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
// which want the latest token, and the search by vendorId and deletion that close an account.
// Like Auth0, it refuses a second user with an email already on that connection, and the lookup
// answers whatever the connection.
export class FakeAuth0 {
  readonly tokenRequests: Record<string, string>[] = [];
  readonly userPages: URLSearchParams[] = [];
  users: Auth0User[] = [];
  tokenStatus = 200;
  usersStatus = 200;
  createStatus = 201;
  // The errorCode Auth0 sends with a refused creation.
  createErrorCode?: string;
  lookupStatus = 200;
  // The errorCode Auth0 sends with a refused lookup.
  lookupErrorCode?: string;
  // Refuses every address as Auth0 refuses one it finds malformed, stricter than our Email, in a
  // lookup as in a creation.
  refusesEmails = false;
  expiresInSeconds = 86_400;
  private server!: Server;
  // Auth0's user_id for each user, kept off the records the specs compare.
  private readonly ids = new WeakMap<Auth0User, string>();
  private lastId = 0;

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
    if (req.method === 'GET' && url.pathname === '/api/v2/users' && url.searchParams.has('q')) {
      if (this.refusesToken(req, res)) {
        return;
      }
      const vendorId = /^app_metadata\.vendorId:"(.*)"$/.exec(url.searchParams.get('q') ?? '')?.[1];
      return send(res, 200, this.users.filter((user) => user.app_metadata?.vendorId === vendorId).map((user) => ({ user_id: this.idOf(user) })));
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/v2/users/')) {
      if (this.refusesToken(req, res)) {
        return;
      }
      const id = decodeURIComponent(url.pathname.slice('/api/v2/users/'.length));
      this.users = this.users.filter((user) => this.idOf(user) !== id);
      res.writeHead(204).end();
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/v2/users') {
      if (this.refusesToken(req, res)) {
        return;
      }
      this.userPages.push(url.searchParams);
      if (this.usersStatus !== 200) {
        return send(res, this.usersStatus, { statusCode: this.usersStatus, errorCode: 'insufficient_scope' });
      }
      const page = Number(url.searchParams.get('page'));
      const perPage = Number(url.searchParams.get('per_page'));
      return send(res, 200, this.users.slice(page * perPage, (page + 1) * perPage));
    }
    if (req.method === 'POST' && url.pathname === '/api/v2/users') {
      if (this.refusesToken(req, res)) {
        return;
      }
      if (this.createStatus !== 201) {
        return send(res, this.createStatus, { statusCode: this.createStatus, errorCode: this.createErrorCode });
      }
      const user = JSON.parse(await bodyOf(req)) as Auth0User;
      if (this.refusesEmails) {
        return send(res, 400, {
          statusCode: 400,
          error: 'Bad Request',
          message: `Payload validation error: 'Object didn't pass validation for format email: ${user.email}' on property email (The user's email).`,
          errorCode: 'invalid_body',
        });
      }
      if (this.users.some((held) => held.email === user.email && held.connection === user.connection)) {
        return send(res, 409, { statusCode: 409, error: 'Conflict', message: 'The user already exists.' });
      }
      this.users.push(user);
      return send(res, 201, user);
    }
    if (req.method === 'GET' && url.pathname === '/api/v2/users-by-email') {
      if (this.refusesToken(req, res)) {
        return;
      }
      if (this.refusesEmails) {
        return send(res, 400, { statusCode: 400, error: 'Bad Request' });
      }
      if (this.lookupStatus !== 200) {
        return send(res, this.lookupStatus, { statusCode: this.lookupStatus, errorCode: this.lookupErrorCode });
      }
      const email = url.searchParams.get('email');
      return send(res, 200, this.users.filter((user) => user.email === email).map(asReturned));
    }
    send(res, 404, {});
  }

  // Every call but the token's own wants the latest token, as Auth0 wants an unexpired one.
  private refusesToken(req: IncomingMessage, res: ServerResponse): boolean {
    if (req.headers.authorization === `Bearer ${this.latestToken()}`) {
      return false;
    }
    send(res, 401, { error: 'invalid_token' });
    return true;
  }

  private idOf(user: Auth0User): string {
    if (!this.ids.has(user)) {
      this.ids.set(user, `email|${++this.lastId}`);
    }
    return this.ids.get(user)!;
  }

  private latestToken(): string {
    return `token-${this.tokenRequests.length}`;
  }
}

// A user as the Management API returns it, which has no top-level connection.
function asReturned({ email, app_metadata }: Auth0User) {
  return { email, ...(app_metadata && { app_metadata }) };
}
