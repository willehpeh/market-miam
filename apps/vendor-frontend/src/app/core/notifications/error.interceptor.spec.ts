import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideStore } from '@ngrx/store';
import { errorInterceptor, GENERIC_ERROR } from './error.interceptor';
import { NotificationsFacade } from './notifications.facade';
import { provideNotifications } from './notifications.providers';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpCtrl: HttpTestingController;
  let notifications: NotificationsFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideStore(),
        provideNotifications(),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpCtrl = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationsFacade);
  });

  afterEach(() => httpCtrl.verify());

  it('raises a generic error when the server fails', () => {
    http.get('/api/anything').subscribe({ error: () => undefined });

    httpCtrl.expectOne('/api/anything').flush(null, { status: 500, statusText: 'Server Error' });

    expect(notifications.message()).toBe(GENERIC_ERROR);
  });

  it('raises a generic error when the network is unreachable', () => {
    http.get('/api/anything').subscribe({ error: () => undefined });

    httpCtrl.expectOne('/api/anything').error(new ProgressEvent('error'), { status: 0 });

    expect(notifications.message()).toBe(GENERIC_ERROR);
  });

  it('leaves client errors to their own handlers', () => {
    let caught: number | undefined;
    http.get('/api/anything').subscribe({ error: (e) => (caught = e.status) });

    httpCtrl.expectOne('/api/anything').flush(null, { status: 404, statusText: 'Not Found' });

    expect(caught).toBe(404);
    expect(notifications.message()).toBeUndefined();
  });
});
