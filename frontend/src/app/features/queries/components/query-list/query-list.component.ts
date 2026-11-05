import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, EMPTY, finalize, merge, Subject, switchMap, tap } from 'rxjs';
import { DiscoveredQuery, QueryFilters, VisibilityFilter } from '../../models/query.model';
import { NotificationService } from '@core/services/notification.service';
import { QueryFiltersComponent } from '../query-filters/query-filters.component';
import { QueryService } from '../../services/query.service';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent, Paginated, StatusBadgeComponent, downloadCsv } from '@shared';

@Component({
  selector: 'app-query-list',
  imports: [
    DecimalPipe, MatButtonModule, MatChipsModule, MatIconModule, MatPaginatorModule,
    MatProgressSpinnerModule, MatTableModule,
    QueryFiltersComponent, EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent, StatusBadgeComponent,
  ],
  templateUrl: './query-list.component.html',
  styleUrl: './query-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryListComponent {
  private readonly queries = inject(QueryService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profileUuid = input.required<string>();
  /** Bumped by the parent (e.g. after a pipeline run) to force a reload. */
  readonly refreshKey = input(0);

  protected readonly isNumber = (v: unknown): boolean => typeof v === 'number';
  protected readonly columns = ['query_text', 'volume', 'difficulty', 'score', 'visibility', 'action'];
  protected readonly data = signal<Paginated<DiscoveredQuery> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rechecking = signal<ReadonlySet<string>>(new Set());
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);

  protected readonly minScore = new FormControl(0, { nonNullable: true });
  protected readonly status = new FormControl<VisibilityFilter>('all', { nonNullable: true });

  private readonly reload$ = new Subject<void>();
  /** Reloads in place without swapping the table for a spinner (used after a recheck). */
  private readonly softReload$ = new Subject<void>();

  constructor() {
    // Hard loads (initial, filter, page change) – switchMap cancels any in-flight request.
    this.reload$
      .pipe(
        debounceTime(200),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() => this.fetch().pipe(finalize(() => this.loading.set(false)))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.data.set(page));

    this.softReload$
      .pipe(switchMap(() => this.fetch()), takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => this.data.set(page));

    merge(this.minScore.valueChanges, this.status.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        this.reload$.next();
      });

    // Re-run when the profile or the parent's refresh counter changes.
    effect(() => {
      this.profileUuid();
      this.refreshKey();
      untracked(() => {
        this.pageIndex.set(0);
        this.reload$.next();
      });
    });
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.reload$.next();
  }

  protected resetFilters(): void {
    this.minScore.setValue(0, { emitEvent: false });
    this.status.setValue('all', { emitEvent: false });
    this.pageIndex.set(0);
    this.reload$.next();
  }

  protected get hasFilters(): boolean {
    return this.minScore.value > 0 || this.status.value !== 'all';
  }

  protected recheck(q: DiscoveredQuery): void {
    if (!q.uuid || this.rechecking().has(q.uuid)) return;
    this.setRechecking(q.uuid, true);
    this.queries
      .recheckQuery(q.uuid)
      .pipe(
        catchError((err: Error) => {
          this.notify.error(`Query recheck failed. ${err.message}`);
          return EMPTY;
        }),
        finalize(() => this.setRechecking(q.uuid, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.notify.success(`Rechecked “${q.query_text}”.`);
        this.softReload$.next(); // refresh the current page only – no full reload
      });
  }

  protected scoreClass(score: number | null): string {
    if (score === null) return 'none';
    return score >= 0.7 ? 'high' : score >= 0.4 ? 'mid' : 'low';
  }

  protected visibilityStatus(v: boolean | null): string {
    return v === null ? 'unknown' : v ? 'visible' : 'not_visible';
  }

  protected exportCsv(): void {
    const rows = this.data()?.items ?? [];
    downloadCsv(
      `queries-${this.profileUuid()}.csv`,
      ['Query', 'Estimated search volume', 'Competitive difficulty', 'Opportunity score', 'Visible', 'Visibility position'],
      rows.map((r) => [r.query_text, r.estimated_search_volume, r.competitive_difficulty, r.opportunity_score, r.domain_visible, r.visibility_position]),
    );
  }

  private fetch() {
    const filters: QueryFilters = {
      min_score: this.minScore.value,
      status: this.status.value === 'all' ? undefined : this.status.value,
      page: this.pageIndex() + 1,
      per_page: this.pageSize(),
    };
    return this.queries.getQueries(this.profileUuid(), filters).pipe(
      catchError((err: Error) => {
        this.error.set(err.message || 'Unable to load queries.');
        this.notify.error('Unable to load queries.');
        return EMPTY;
      }),
    );
  }

  private setRechecking(uuid: string, on: boolean): void {
    this.rechecking.update((s) => {
      const next = new Set(s);
      if (on) next.add(uuid);
      else next.delete(uuid);
      return next;
    });
  }
}
