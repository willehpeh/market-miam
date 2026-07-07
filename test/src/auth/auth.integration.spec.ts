import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule, CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import { InvalidTokenError, TokenVerifier, VerifiedVendor } from '@market-miam/auth';
import { VendorId } from '@market-miam/shared-kernel';
import { Email } from '@market-miam/common';
import { FakeTokenVerifier } from './fake.token-verifier';

const VENDOR: VerifiedVendor = {
  vendorId: new VendorId('b8c9d0e1-2f34-4a56-8b90-1c2d3e4f5a6b'),
  email: new Email('vendor@domain.com'),
};

@Controller()
class ProtectedController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentVendor() vendor: VerifiedVendor) {
    return { vendorId: vendor.vendorId.value() };
  }
}

async function bootWith(verifier: TokenVerifier): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule.forRootAsync({ useFactory: () => verifier })],
    controllers: [ProtectedController],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
}

describe('Auth integration (guard + decorator + module)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('authenticates a valid bearer token and hands the vendor to the route', async () => {
    const verifier = new FakeTokenVerifier(VENDOR);
    app = await bootWith(verifier);

    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer the.access.token')
      .expect(200, { vendorId: VENDOR.vendorId.value() });

    expect(verifier.verified).toEqual(['the.access.token']);
  });

  it('rejects a token the verifier refuses', async () => {
    app = await bootWith(new FakeTokenVerifier(new InvalidTokenError()));

    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer rejected')
      .expect(401);
  });

  it.each([
    { scenario: 'no Authorization header', header: undefined },
    { scenario: 'a non-Bearer scheme', header: 'Basic abc123' },
    { scenario: 'an empty bearer token', header: 'Bearer ' },
  ])('rejects $scenario without consulting the verifier', async ({ header }) => {
    const verifier = new FakeTokenVerifier(VENDOR);
    app = await bootWith(verifier);

    const call = request(app.getHttpServer()).get('/me');
    if (header !== undefined) {
      call.set('Authorization', header);
    }
    await call.expect(401);

    expect(verifier.verified).toEqual([]);
  });
});
