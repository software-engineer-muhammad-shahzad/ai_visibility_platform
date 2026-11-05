import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Subject, catchError, EMPTY, finalize, switchMap, tap } from 'rxjs';
import { NotificationService } from '@core/services/notification.service';
import { AsyncStateComponent, EmptyStateComponent } from '@shared';
import { ContentRecommendation, Priority } from '../../models/recommendation.model';
import { RecommendationService } from '../../services/recommendation.service';
import { RecommendationCardComponent } from '../recommendation-card/recommendation-card.component';

type PriorityFilter = 'all' | Priority;

@Component({
  selector: 'app-recommendation-list',
  imports: [MatButtonToggleModule, AsyncStateComponent, EmptyStateComponent, RecommendationCardComponent],
  templateUrl: './recommendation-list.component.html',
  styleUrl: './recommendation-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendationListComponent {
  private readonly service = inject(RecommendationService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profileUuid = input.required<string>();
  readonly refreshKey = input(0);

  protected readonly items = signal<ContentRecommendation[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal<PriorityFilter>('all');
  private readonly reload$ = new Subject<void>();

  /** Local filtering of the already-loaded API data. */
  protected readonly visible = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.items() : this.items().filter((r) => r.priority === f);
  });

  constructor() {
    this.reload$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.service.getRecommendations(this.profileUuid()).pipe(
            catchError((err: Error) => {
              this.error.set(err.message || 'Unable to load recommendations.');
              this.notify.error('Unable to load recommendations.');
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => this.items.set(list));

    effect(() => {
      this.profileUuid();
      this.refreshKey();
      untracked(() => this.reload$.next());
    });
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected setFilter(value: PriorityFilter): void {
    this.filter.set(value);
  }
}
