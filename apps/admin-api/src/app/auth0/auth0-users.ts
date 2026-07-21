export interface Auth0Account {
  email: string;
  vendorId?: string;
}

export abstract class Auth0Users {
  abstract all(): Promise<Auth0Account[]>;
}
