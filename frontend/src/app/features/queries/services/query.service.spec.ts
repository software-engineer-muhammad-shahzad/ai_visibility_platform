import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { environment } from '@env/environment';
import { QueryService } from './query.service';

describe('QueryService', () => {
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getQueries sends filter and pagination params', () => {
    let total = 0;
    TestBed.inject(QueryService).getQueries('abc', { min_score: 0.5, status: 'visible', page: 2, per_page: 25 }).subscribe((p) => (total = p.total));
    const req = http.expectOne((r) => r.url === `${api}/profiles/abc/queries`);
    expect(req.request.params.get('min_score')).toBe('0.5');
    expect(req.request.params.get('status')).toBe('visible');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('per_page')).toBe('25');
    req.flush({ queries: [{ uuid: 'q1', query_text: 'x', opportunity_score: 0.9, domain_visible: true }], total: 42 });
    expect(total).toBe(42);
  });

  it('omits min_score when 0 and status when unset', () => {
    TestBed.inject(QueryService).getQueries('abc', { min_score: 0 }).subscribe();
    const req = http.expectOne((r) => r.url === `${api}/profiles/abc/queries`);
    expect(req.request.params.has('min_score')).toBeFalse();
    expect(req.request.params.has('status')).toBeFalse();
    req.flush({ queries: [] });
  });

  it('recheckQuery POSTs to /queries/{uuid}/recheck', () => {
    TestBed.inject(QueryService).recheckQuery('q1').subscribe();
    const req = http.expectOne(`${api}/queries/q1/recheck`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
