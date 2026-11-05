import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { NotificationService } from '@core/services/notification.service';
import { OpportunityChartComponent, QueryListComponent } from '@features/queries';
import { RecommendationListComponent } from '@features/recommendations';
import { ErrorStateComponent, LoadingSpinnerComponent, HeaderComponent } from '@shared';
import { Observable, Subscription, catchError, EMPTY, finalize, interval, of, switchMap, tap } from 'rxjs';
import { PipelineSummaryCardComponent } from '../../components/pipeline-summary-card/pipeline-summary-card.component';
import { ProfileInfoCardComponent } from '../../components/profile-info-card/profile-info-card.component';
import { PipelineRun } from '../../models/pipeline-run.model';
import { BusinessProfile } from '../../models/profile.model';
import { PipelineService } from '../../services/pipeline.service';
import { ProfileRegistryService } from '../../services/profile-registry.service';
import { ProfileService } from '../../services/profile.service';
import { isFailed, isInProgress } from '../../utils/profile.mapper';

@Component({
  selector: 'app-profile-detail',
  imports: [
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule,
    HeaderComponent, LoadingSpinnerComponent, ErrorStateComponent,
    ProfileInfoCardComponent, PipelineSummaryCardComponent,
    QueryListComponent, OpportunityChartComponent, RecommendationListComponent,
  ],
  templateUrl: './profile-detail.component.html',
  styleUrl: './profile-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDetailComponent {
  private readonly profiles = inject(ProfileService);
  private readonly pipeline = inject(PipelineService);
  private readonly registry = inject(ProfileRegistryService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /** Bound from the `:uuid` route param via withComponentInputBinding(). */
  readonly uuid = input.required<string>();

  protected readonly profile = signal<BusinessProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly running = signal(false);
  /** True when the last run request itself errored (network, 4xx/5xx) before a run record existed. */
  private readonly requestFailed = signal(false);
  protected readonly run = signal<PipelineRun | null>(null);
  /** Increments when a pipeline finishes so child tabs reload their data. */
  protected readonly refreshKey = signal(0);

  /** Effective status shown on the pipeline card: the live profile status while running, else the run's status. */
  protected readonly pipelineStatus = computed(() => (this.running() ? this.profile()?.status ?? this.run()?.status ?? 'running' : this.run()?.status ?? null));

  /** The last run failed or only partly succeeded, so the user should be offered a retry. */
  protected readonly needsRetry = computed(() => {
    if (this.running()) return false;
    const r = this.run();
    if (!r) return this.requestFailed() || isFailed(this.profile()?.status);
    const partial = r.queries_discovered !== null && r.queries_scored !== null && r.queries_scored < r.queries_discovered;
    return isFailed(r.status) || !!r.error_message || partial;
  });
  protected readonly runLabel = computed(() =>
    this.running() ? 'Running pipeline…' : this.needsRetry() ? this.retryLabel() : this.run() ? 'Run Again' : 'Run Pipeline',
  );

  private readonly retryLabel = computed(() => {
    const r = this.run();
    return r?.uuid && isFailed(r.status) && r.failed_stage ? `Retry ${r.failed_stage} stage` : 'Retry Pipeline';
  });

  private pollSub?: Subscription;
  /** While a run is in progress, refreshes the run so the per-stage statuses update live. */
  private liveSub?: Subscription;

  constructor() {
    effect(() => {
      const id = this.uuid();
      untracked(() => this.loadProfile(id));
    });
    // Safe lifecycle: polling is also cancelled when the component is destroyed.
    this.destroyRef.onDestroy(() => {
      this.pollSub?.unsubscribe();
      this.liveSub?.unsubscribe();
    });
  }

  protected loadProfile(id = this.uuid()): void {
    this.pollSub?.unsubscribe();
    this.running.set(false);
    this.loading.set(true);
    this.error.set(null);
    this.run.set(this.registry.getRun(id));
    this.profiles
      .getProfile(id)
      .pipe(
        catchError((err: Error) => {
          this.error.set(err.message || 'Unable to load business profile.');
          this.notify.error('Unable to load business profile.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((p) => {
        this.profile.set(p);
        this.loadLatestRun(id);
        // If the profile is already mid-pipeline (e.g. page reloaded), resume tracking it.
        if (isInProgress(p.status)) this.track(id);
      });
  }

  /** The backend is the source of truth for the last run (the browser copy may be missing or stale). */
  private loadLatestRun(id: string): void {
    this.pipeline
      .latestRun(id)
      .pipe(catchError(() => EMPTY), takeUntilDestroyed(this.destroyRef))
      .subscribe((run) => {
        if (run && !this.running()) this.run.set(run);
      });
  }

  /** Header / card button: resumes the failed run when there is one, otherwise starts a new run. */
  protected runPipeline(): void {
    const last = this.run();
    if (this.needsRetry() && last?.uuid && isFailed(last.status)) this.execute(this.pipeline.retryPipeline(last.uuid, this.uuid()), `Retrying from the ${last.failed_stage ?? 'failed'} stage…`);
    else this.execute(this.pipeline.runPipeline(this.uuid()), 'Pipeline started…');
  }

  private execute(request$: Observable<PipelineRun>, startMessage: string): void {
    if (this.running()) return;
    const id = this.uuid();
    this.running.set(true);
    this.requestFailed.set(false);
    this.notify.info(startMessage);

    this.pollSub?.unsubscribe();
    this.startLiveRunUpdates(id);
    this.pollSub = request$
      .pipe(
        tap((run) => this.run.set(run)),
        // The run endpoint may be synchronous (already finished) or asynchronous (still running).
        // Re-read the profile and keep polling only while the API reports an in-progress status.
        switchMap((run) =>
          this.profiles.getProfile(id).pipe(
            tap((p) => this.profile.set(p)),
            switchMap((p) => (isInProgress(run.status) || isInProgress(p.status) ? this.pipeline.pollUntilDone(id) : of(p))),
          ),
        ),
        tap((p) => this.profile.set(p)),
        catchError((err: Error) => {
          this.failRun(err.message);
          return EMPTY;
        }),
        finalize(() => undefined),
      )
      .subscribe({ complete: () => this.finishRun() });
  }

  private startLiveRunUpdates(id: string): void {
    this.liveSub?.unsubscribe();
    this.liveSub = interval(2500)
      .pipe(switchMap(() => this.pipeline.latestRun(id).pipe(catchError(() => EMPTY))))
      .subscribe((latest) => {
        if (latest && this.running()) this.run.set(latest);
      });
  }

  /** Resumes polling for an already-running pipeline. */
  private track(id: string): void {
    this.running.set(true);
    this.startLiveRunUpdates(id);
    this.pollSub?.unsubscribe();
    this.pollSub = this.pipeline
      .pollUntilDone(id)
      .pipe(
        tap((p) => this.profile.set(p)),
        catchError((err: Error) => {
          this.failRun(err.message);
          return EMPTY;
        }),
      )
      .subscribe({ complete: () => this.finishRun() });
  }

  private finishRun(): void {
    if (!this.running()) return; // already handled by failRun
    this.running.set(false);
    this.liveSub?.unsubscribe();
    // the backend holds the final run (stage statuses, error message), so read it before reporting
    this.pipeline
      .latestRun(this.uuid())
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((latest) => {
        if (latest) {
          this.run.set(latest);
          this.registry.saveRun(latest);
        }
        const run = latest ?? this.run();
        if (isFailed(run?.status) || isFailed(this.profile()?.status)) {
          const stage = run?.failed_stage ? ` at the ${run.failed_stage} stage` : '';
          this.notify.error(`Pipeline failed${stage}.${run?.error_message ? ' ' + run.error_message : ''} You can retry it.`);
        } else {
          this.notify.success('Pipeline completed. Queries and recommendations refreshed.');
        }
        this.refreshKey.update((k) => k + 1); // children reload queries / chart / recommendations
      });
  }

  private failRun(message: string): void {
    this.running.set(false);
    this.liveSub?.unsubscribe();
    this.requestFailed.set(true);
    this.notify.error(`Pipeline execution failed. ${message}`);
  }
}
