import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_CONFIG, apiUrl } from '@core/config/api.config';
import { unwrapList } from '@shared/utils/api-response';
import { Observable, map } from 'rxjs';
import { PipelineRun } from '../models/pipeline-run.model';
import { BusinessProfile, CreateProfileRequest } from '../models/profile.model';
import { toPipelineRun, toProfile } from '../utils/profile.mapper';

/** Raw HTTP access for profiles and pipeline runs. Returns normalised models, with no side effects. */
@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly profiles = API_CONFIG.ENDPOINTS.PROFILES;

  /** GET /profiles */
  list(): Observable<BusinessProfile[]> {
    return this.http.get<unknown>(apiUrl(this.profiles)).pipe(map((res) => (Array.isArray(res) ? res : []).map(toProfile)));
  }

  /** POST /profiles */
  create(body: CreateProfileRequest): Observable<BusinessProfile> {
    return this.http.post<unknown>(apiUrl(this.profiles), body).pipe(map(toProfile));
  }

  /** GET /profiles/{uuid} */
  get(uuid: string): Observable<BusinessProfile> {
    return this.http.get<unknown>(apiUrl(this.profiles, uuid)).pipe(
      map(toProfile),
      map((p) => (p.uuid ? p : { ...p, uuid })),
    );
  }

  /** GET /profiles/{uuid}/runs - newest first; resolves to the latest run or null. */
  latestRun(uuid: string): Observable<PipelineRun | null> {
    return this.http.get<unknown>(apiUrl(this.profiles, uuid, 'runs')).pipe(
      map((res) => unwrapList(res, ['runs'])),
      map((runs) => (runs.length ? toPipelineRun(runs[0], uuid) : null)),
    );
  }

  /** POST /pipeline-runs/{run_uuid}/retry - resumes a failed run, skipping completed stages. */
  retry(runUuid: string, profileUuid: string): Observable<PipelineRun> {
    return this.http
      .post<unknown>(apiUrl(API_CONFIG.ENDPOINTS.PIPELINE_RUNS, runUuid, 'retry'), {})
      .pipe(map((res) => toPipelineRun(res, profileUuid)));
  }

  /** POST /profiles/{uuid}/run */
  run(uuid: string): Observable<PipelineRun> {
    return this.http.post<unknown>(apiUrl(this.profiles, uuid, 'run'), {}).pipe(map((res) => toPipelineRun(res, uuid)));
  }
}
