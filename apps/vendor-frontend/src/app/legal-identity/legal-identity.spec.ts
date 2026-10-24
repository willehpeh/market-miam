import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideStore } from '@ngrx/store';
import { provideRouter, Router } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLegalIdentity } from './legal-identity.providers';
import { LegalIdentityFacade } from './legal-identity.facade';
import { LegalIdentityView } from './legal-identity';
import { CompanyRegistry } from './company-registry';
import { FakeCompanyRegistry } from './fake.company-registry';
import { SAVED_REDIRECT_DELAY } from '../onboarding/onboarding.effects';

const IDENTITY: LegalIdentityView = {
  siret: '73282932000074',
  legalName: 'Margaux Dupont',
  address: '12 rue des Halles, 69004 Lyon',
  contactEmail: 'contact@margaux.fr',
  phone: '06 12 34 56 78',
  vatRegime: 'franchise',
  mediatorName: null,
  mediatorUrl: null,
  legalForm: null,
  shareCapital: null,
  registryCity: null,
  legalRepresentative: null,
};

@Component({ template: '' })
class Dashboard {}

const notFound = { status: 404, statusText: 'Not Found' };

describe('Legal identity', () => {
  let facade: LegalIdentityFacade;
  let registry: FakeCompanyRegistry;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideStore(),
        provideLegalIdentity(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'dashboard', component: Dashboard }]),
        { provide: CompanyRegistry, useClass: FakeCompanyRegistry },
        { provide: SAVED_REDIRECT_DELAY, useValue: 0 },
      ],
    });
    facade = TestBed.inject(LegalIdentityFacade);
    registry = TestBed.inject(CompanyRegistry) as FakeCompanyRegistry;
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('exposes the recorded identity once loaded', () => {
    facade.load();
    expect(facade.loading()).toBe(true);

    const req = httpCtrl.expectOne('/api/legal-identity');
    expect(req.request.method).toBe('GET');
    req.flush(IDENTITY);

    expect(facade.identity()).toEqual(IDENTITY);
    expect(facade.loading()).toBe(false);
  });

  // GET is 404 until the vendor provides one: an answer, not a failure to retry.
  it('knows no identity was provided on a 404', () => {
    facade.load();

    httpCtrl.expectOne('/api/legal-identity').flush(null, notFound);

    expect(facade.identity()).toBeNull();
    expect(facade.loading()).toBe(false);
  });

  it('leaves the identity unknown when the load fails otherwise', () => {
    facade.load();

    httpCtrl.expectOne('/api/legal-identity').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.identity()).toBeUndefined();
    expect(facade.loading()).toBe(false);
  });

  it('does not ask again once the identity is known', () => {
    facade.load();
    httpCtrl.expectOne('/api/legal-identity').flush(null, notFound);

    facade.load();

    httpCtrl.expectNone('/api/legal-identity');
  });

  it('sends every field, the absent optionals as null', () => {
    facade.save(IDENTITY);

    const req = httpCtrl.expectOne('/api/legal-identity');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(IDENTITY);
    req.flush(null);

    expect(facade.saved()).toBe(true);
    expect(facade.saveFailed()).toBe(false);
  });

  // The projection lags the PUT, so a reload could 404 and take the saved identity back.
  it('holds the saved identity without asking the API again', () => {
    facade.save(IDENTITY);
    httpCtrl.expectOne('/api/legal-identity').flush(null);

    facade.load();

    httpCtrl.expectNone('/api/legal-identity');
    expect(facade.identity()).toEqual(IDENTITY);
  });

  it('reports a refused save', () => {
    facade.save(IDENTITY);

    httpCtrl.expectOne('/api/legal-identity').flush({ message: 'SIRET' }, { status: 400, statusText: 'Bad Request' });

    expect(facade.saved()).toBe(false);
    expect(facade.saveFailed()).toBe(true);
  });

  it('goes back to the dashboard once saved', async () => {
    const router = TestBed.inject(Router);

    facade.save(IDENTITY);
    httpCtrl.expectOne('/api/legal-identity').flush(null);
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(router.url).toBe('/dashboard');
    expect(facade.saved()).toBe(false);
  });

  it('finds the company the registry knows by its SIRET', () => {
    registry.register('73282932000074', { legalName: 'MARGAUX DUPONT', address: '12 RUE DES HALLES 69004 LYON', individual: true });

    facade.lookUpCompany('73282932000074');

    expect(facade.company()).toEqual({ legalName: 'MARGAUX DUPONT', address: '12 RUE DES HALLES 69004 LYON', individual: true });
  });

  it('reports a SIRET the registry does not know', () => {
    facade.lookUpCompany('44306184100047');

    expect(facade.company()).toBeNull();
  });
});
