import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CurrentOperator, OperatorAuthGuard, OperatorAuthModule } from '@market-miam/auth-nestjs';
import {
  InvalidTokenError,
  NotAnOperatorError,
  OperatorTokenVerifier,
  VerifiedOperator,
} from '@market-miam/auth';
import { FakeOperatorTokenVerifier } from './fake.operator-token-verifier';

const OPERATOR: VerifiedOperator = { operatorId: 'github|1234567' };

@Controller()
@UseGuards(OperatorAuthGuard)
class OperatorOnlyController {
  @Get('whoami')
  whoami(@CurrentOperator() operator: VerifiedOperator) {
    return { operatorId: operator.operatorId };
  }
}

async function bootWith(verifier: OperatorTokenVerifier): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [OperatorAuthModule.forRootAsync({ useFactory: () => verifier })],
    controllers: [OperatorOnlyController],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
}

describe('Operator auth integration (guard + decorator + module)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('authenticates an operator token and hands the operator to the route', async () => {
    const verifier = new FakeOperatorTokenVerifier(OPERATOR);
    app = await bootWith(verifier);

    await request(app.getHttpServer())
      .get('/whoami')
      .set('Authorization', 'Bearer the.access.token')
      .expect(200, { operatorId: OPERATOR.operatorId });

    expect(verifier.verified).toEqual(['the.access.token']);
  });

  it('answers 401 to a token the verifier finds invalid', async () => {
    app = await bootWith(new FakeOperatorTokenVerifier(new InvalidTokenError()));

    await request(app.getHttpServer()).get('/whoami').set('Authorization', 'Bearer rejected').expect(401);
  });

  it('answers 403 to a genuine token whose holder is not an operator', async () => {
    app = await bootWith(new FakeOperatorTokenVerifier(new NotAnOperatorError()));

    await request(app.getHttpServer()).get('/whoami').set('Authorization', 'Bearer signed.in').expect(403);
  });

  it('answers 401 when verification fails for any other reason', async () => {
    app = await bootWith(new FakeOperatorTokenVerifier(new Error('JWKS unreachable')));

    await request(app.getHttpServer()).get('/whoami').set('Authorization', 'Bearer any').expect(401);
  });

  it.each([
    { scenario: 'no Authorization header', header: undefined },
    { scenario: 'a non-Bearer scheme', header: 'Basic abc123' },
    { scenario: 'an empty bearer token', header: 'Bearer ' },
  ])('rejects $scenario without consulting the verifier', async ({ header }) => {
    const verifier = new FakeOperatorTokenVerifier(OPERATOR);
    app = await bootWith(verifier);

    const call = request(app.getHttpServer()).get('/whoami');
    if (header !== undefined) {
      call.set('Authorization', header);
    }
    await call.expect(401);

    expect(verifier.verified).toEqual([]);
  });
});
