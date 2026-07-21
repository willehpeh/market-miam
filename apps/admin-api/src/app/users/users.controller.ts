import { Controller, Get } from '@nestjs/common';
import { Auth0Users } from '../auth0/auth0-users';
import { Subdomains } from '../subdomains/subdomains';

@Controller('users')
export class UsersController {
  constructor(private readonly users: Auth0Users, private readonly subdomains: Subdomains) {}

  @Get()
  async list(): Promise<Array<{ email: string; vendorId: string; subdomain: string }>> {
    const [accounts, subdomains] = await Promise.all([this.users.all(), this.subdomains.byVendor()]);
    return accounts.map((account) => ({
      email: account.email,
      vendorId: account.vendorId ?? '',
      subdomain: account.vendorId ? subdomains.get(account.vendorId) ?? '' : '',
    }));
  }
}
