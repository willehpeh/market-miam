import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FakeOperatorApi } from '../core/http/fake-operator-api';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Assignments } from './assignments';
import { HttpAssignments } from './http.assignments';
import { assignmentFeature } from './assignment.state';
import { AssignmentEffects } from './assignment.effects';
import { AssignmentFacade } from './assignment.facade';
import { StoreAssignmentFacade } from './store.assignment.facade';

// The subdomain assignment feature from its facade to the operator API (ADR 0061).
describe('Assignments', () => {
  let facade: AssignmentFacade;
  let api: FakeOperatorApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Assignments, useClass: HttpAssignments },
        provideStore(),
        provideState(assignmentFeature),
        provideEffects(AssignmentEffects),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AssignmentFacade, useClass: StoreAssignmentFacade },
      ],
    });
    facade = TestBed.inject(AssignmentFacade);
    api = new FakeOperatorApi(TestBed.inject(HttpTestingController));
  });

  afterEach(() => api.verify());

  it("sends the vendor's subdomain to the operator API", () => {
    facade.assign('brioche-co', 'brioche');

    const request = api.assignmentOf('brioche-co');
    expect(request.method).toBe('PUT');
    expect(request.body).toEqual({ subdomain: 'brioche' });
    request.noContent();
  });

  // So the list can hold the field while it goes.
  it('reports whose assignment is in flight, and only while it is', () => {
    expect(facade.assigning()).toBeNull();

    facade.assign('brioche-co', 'brioche');
    const request = api.assignmentOf('brioche-co');
    expect(facade.assigning()).toBe('brioche-co');

    request.noContent();
    expect(facade.assigning()).toBeNull();
  });

  // So the list can say why beside the vendor's row, until the next assignment starts.
  it.each([
    [409, 'taken'],
    [400, 'invalid'],
  ] as const)('reports a name the API refuses with a %i as %s', (status, refusal) => {
    facade.assign('brioche-co', 'brioche');
    api.assignmentOf('brioche-co').refuse(status);

    expect(facade.refused()).toEqual({ vendorId: 'brioche-co', refusal });
    expect(facade.assigning()).toBeNull();

    facade.assign('brioche-co', 'brioche-co');
    expect(facade.refused()).toBeNull();
    api.assignmentOf('brioche-co').noContent();
  });
});
