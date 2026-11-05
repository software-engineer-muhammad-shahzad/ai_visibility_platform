import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Subject, catchError, EMPTY, finalize, switchMap, tap } from 'rxjs';
import { AsyncStateComponent } from '@shared';
import { DiscoveredQuery } from '../../models/query.model';
import { NotificationService } from '@core/services/notification.service';
import { QueryService } from '../../services/query.service';
import { ThemeService } from '@core/services/theme.service';

const MAX_LABEL = 30;
const BLUE = '#2563eb';
const ORANGE = '#f97316';
const GRAY = '#94a3b8';

const truncate = (s: string): string => (s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL - 1)}…` : s);

@Component({
  selector: 'app-opportunity-chart',
  imports: [BaseChartDirective, AsyncStateComponent],
  templateUrl: './opportunity-chart.component.html',
  styleUrl: './opportunity-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpportunityChartComponent {
  private readonly queries = inject(QueryService);
  private readonly notify = inject(NotificationService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profileUuid = input.required<string>();
  readonly refreshKey = input(0);

  protected readonly rows = signal<DiscoveredQuery[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly reload$ = new Subject<void>();

  protected readonly scored = computed(() => this.rows().filter((q) => q.opportunity_score !== null));
  protected readonly chartWidth = computed(() => `max(100%, ${this.scored().length * 44}px)`);

  protected readonly chartData = computed<ChartData<'bar'>>(() => {
    const items = this.scored();
    const series = (visible: boolean | null) => items.map((q) => (q.domain_visible === visible ? q.opportunity_score : null));
    const datasets: ChartData<'bar'>['datasets'] = [
      { label: 'Domain visible', data: series(true), backgroundColor: BLUE, borderRadius: 4, maxBarThickness: 36 },
      { label: 'Not visible', data: series(false), backgroundColor: ORANGE, borderRadius: 4, maxBarThickness: 36 },
    ];
    if (items.some((q) => q.domain_visible === null)) {
      datasets.push({ label: 'Unknown', data: series(null), backgroundColor: GRAY, borderRadius: 4, maxBarThickness: 36 });
    }
    return { labels: items.map((q) => truncate(q.query_text)), datasets };
  });

  protected readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const text = this.theme.dark() ? '#c7d0e0' : '#475467';
    const grid = this.theme.dark() ? '#25314a' : '#e6eaf0';
    const items = this.scored();
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, ticks: { color: text, maxRotation: 60, minRotation: 45, autoSkip: false }, grid: { display: false }, title: { display: true, text: 'Query', color: text } },
        y: { stacked: true, min: 0, max: 1, ticks: { color: text, stepSize: 0.2 }, grid: { color: grid }, title: { display: true, text: 'Opportunity score', color: text } },
      },
      plugins: {
        title: { display: true, text: 'Opportunity score by query', color: text, font: { size: 15, weight: 600 } },
        legend: { position: 'bottom', labels: { color: text } },
        tooltip: {
          callbacks: {
            title: (ctx) => items[ctx[0].dataIndex]?.query_text ?? ctx[0].label,
            label: (ctx) => `${ctx.dataset.label}: opportunity score ${Number(ctx.parsed.y).toFixed(2)}`,
          },
        },
      },
    };
  });

  constructor() {
    this.reload$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          // The API paginates; request the largest page (100) to chart as many queries as possible.
          this.queries.getQueries(this.profileUuid(), { page: 1, per_page: 100 }).pipe(
            catchError((err: Error) => {
              this.error.set(err.message || 'Unable to load queries.');
              this.notify.error('Unable to load queries for the chart.');
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.rows.set(page.items);
        this.total.set(page.total);
      });

    effect(() => {
      this.profileUuid();
      this.refreshKey();
      untracked(() => this.reload$.next());
    });
  }

  protected reload(): void {
    this.reload$.next();
  }
}
