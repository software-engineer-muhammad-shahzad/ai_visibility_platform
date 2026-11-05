import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { ApiError } from '@core/models/api-error';
import { environment } from '@env/environment';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import { isInProgress } from '../utils/profile.mapper';
import { PipelineService } from './pipeline.service';
import { ProfileService } from './profile.service';

describe('Pipeline retry, profile list and dashboard services', () => {
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

  it('retryPipeline POSTs /pipeline-runs/{uuid}/retry and maps the stage statuses', () => {
    let stages: (string | null)[] = [];
    TestBed.inject(PipelineService)
      .retryPipeline('run-1', 'p-1')
      .subscribe((r) => (stages = [r.discovery_status, r.scoring_status, r.recommendation_status, r.failed_stage]));
    const req = http.expectOne(`${api}/pipeline-runs/run-1/retry`);
    expect(req.request.method).toBe('POST');
    req.flush({
      uuid: 'run-1', profile_uuid: 'p-1', status: 'failed', discovery_status: 'completed', scoring_status: 'completed',
      recommendation_status: 'failed', failed_stage: 'recommendation', retry_count: 1,
    });
    expect(stages).toEqual(['completed', 'completed', 'failed', 'recommendation']);
  });

  it('retryPipeline surfaces the API error message (e.g. 409 nothing to retry)', () => {
    let err: ApiError | undefined;
    TestBed.inject(PipelineService).retryPipeline('run-1', 'p-1').subscribe({ error: (e: ApiError) => (err = e) });
    http.expectOne(`${api}/pipeline-runs/run-1/retry`).flush({ error: 'Nothing to retry' }, { status: 409, statusText: 'Conflict' });
    expect(err?.message).toBe('Nothing to retry');
    expect(err?.status).toBe(409);
  });

  it('latestRun returns the first run of GET /profiles/{uuid}/runs, or null when there is none', () => {
    const svc = TestBed.inject(PipelineService);
    let latest: string | null | undefined;
    svc.latestRun('p-1').subscribe((r) => (latest = r?.uuid));
    http.expectOne(`${api}/profiles/p-1/runs`).flush({ runs: [{ uuid: 'r2' }, { uuid: 'r1' }] });
    expect(latest).toBe('r2');

    let none: unknown = 'unset';
    svc.latestRun('p-2').subscribe((r) => (none = r));
    http.expectOne(`${api}/profiles/p-2/runs`).flush({ runs: [] });
    expect(none).toBeNull();
  });

  it('listProfiles GETs /profiles and tolerates an empty list', () => {
    let count = -1;
    TestBed.inject(ProfileService).listProfiles().subscribe((l) => (count = l.length));
    http.expectOne(`${api}/profiles`).flush([]);
    expect(count).toBe(0);
  });

  it('a new profile (status "pending") is idle, not in progress', () => {
    expect(isInProgress('pending')).toBeFalse();
    expect(isInProgress('running')).toBeTrue();
  });

  it('DashboardService maps /dashboard/summary including recent runs', () => {
    let totals: number[] = [];
    let runName = '';
    TestBed.inject(DashboardService)
      .loadSummary()
      .subscribe((s) => {
        totals = [s.totalProfiles, s.totalQueries];
        runName = s.runs[0]?.business_name ?? '';
      });
    http.expectOne(`${api}/dashboard/summary`).flush({
      total_profiles: 2, total_queries: 30, scored_queries: 30, average_opportunity_score: 0.42, profiles: [],
      recent_runs: [{ uuid: 'r1', profile_uuid: 'p1', business_name: 'Surfer SEO', status: 'completed' }],
    });
    expect(totals).toEqual([2, 30]);
    expect(runName).toBe('Surfer SEO');
  });
});
