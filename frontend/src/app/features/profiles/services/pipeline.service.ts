import { Injectable, inject } from '@angular/core';
import { Observable, interval, startWith, switchMap, take, takeWhile, tap } from 'rxjs';
import { ProfileApiService } from '../api/profile-api.service';
import { PipelineRun } from '../models/pipeline-run.model';
import { BusinessProfile } from '../models/profile.model';
import { isInProgress } from '../utils/profile.mapper';
import { ProfileRegistryService } from './profile-registry.service';
import { ProfileService } from './profile.service';

@Injectable({ providedIn: 'root' })
export class PipelineService {
  private readonly api = inject(ProfileApiService);
  private readonly profiles = inject(ProfileService);
  private readonly registry = inject(ProfileRegistryService);

  /** Starts the pipeline (POST /profiles/{uuid}/run) and records the run. */
  runPipeline(profileUuid: string): Observable<PipelineRun> {
    return this.api.run(profileUuid).pipe(tap((run) => this.registry.saveRun(run)));
  }

  /** Resumes a failed run at its failed stage (POST /pipeline-runs/{uuid}/retry) and records the result. */
  retryPipeline(runUuid: string, profileUuid: string): Observable<PipelineRun> {
    return this.api.retry(runUuid, profileUuid).pipe(tap((run) => this.registry.saveRun(run)));
  }

  /** The most recent run stored by the backend (null when the profile has never run). */
  latestRun(profileUuid: string): Observable<PipelineRun | null> {
    return this.api.latestRun(profileUuid);
  }

  /**
   * The API documents no dedicated pipeline-status endpoint, so progress is tracked through the
   * supported GET /profiles/{uuid} endpoint, whose `status` reflects the pipeline state.
   * Emits every polled profile and completes (inclusive) once the status leaves the in-progress set.
   * Callers stop it early with takeUntil / takeUntilDestroyed.
   */
  pollUntilDone(profileUuid: string, everyMs = 3000, maxPolls = 200): Observable<BusinessProfile> {
    return interval(everyMs).pipe(
      startWith(0),
      switchMap(() => this.profiles.getProfile(profileUuid)),
      takeWhile((p) => isInProgress(p.status), true),
      take(maxPolls),
    );
  }
}
