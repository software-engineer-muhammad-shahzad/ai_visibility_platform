import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { ApiError } from '@core/models/api-error';
import { environment } from '@env/environment';
import { PipelineService } from './pipeline.service';
import { ProfileService } from './profile.service';

describe('Profile & pipeline services', () => {
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ProfileService.createProfile POSTs to /profiles and maps the response', () => {
    const body = { name: 'Surfer', domain: 'surferseo.com', industry: 'SEO', description: 'd', competitors: ['x.com'] };
    let uuid = '';
    TestBed.inject(ProfileService).createProfile(body).subscribe((p) => (uuid = p.uuid));
    const req = http.expectOne(`${api}/profiles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ uuid: 'abc', ...body, status: 'active' });
    expect(uuid).toBe('abc');
  });

  it('ProfileService.getProfile GETs /profiles/{uuid}', () => {
    TestBed.inject(ProfileService).getProfile('abc').subscribe();
    const req = http.expectOne(`${api}/profiles/abc`);
    expect(req.request.method).toBe('GET');
    req.flush({ profile: { uuid: 'abc', name: 'N', domain: 'd.com', competitors: [] } });
  });

  it('PipelineService.runPipeline POSTs to /profiles/{uuid}/run', () => {
    let status: string | null = null;
    TestBed.inject(PipelineService).runPipeline('abc').subscribe((r) => (status = r.status));
    const req = http.expectOne(`${api}/profiles/abc/run`);
    expect(req.request.method).toBe('POST');
    req.flush({ status: 'completed', queries_discovered: 10, queries_scored: 10, tokens_used: 1234 });
    expect(status as string | null).toBe('completed');
  });

  it('interceptor converts HTTP errors to ApiError with a friendly message', () => {
    let err: unknown;
    TestBed.inject(ProfileService).getProfile('nope').subscribe({ error: (e) => (err = e) });
    http.expectOne(`${api}/profiles/nope`).flush({ error: 'Profile not found' }, { status: 404, statusText: 'Not Found' });
    expect(err instanceof ApiError).toBeTrue();
    expect((err as ApiError).message).toBe('Profile not found');
  });
});
