import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import {
  EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent, HeaderComponent, SectionCardComponent, StatCardComponent,
} from '@shared';
import { catchError, EMPTY, finalize } from 'rxjs';
import { RecentRunsTableComponent } from '../../components/recent-runs-table/recent-runs-table.component';
import { DashboardSummary } from '../../models/dashboard.model';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    DecimalPipe, RouterLink, MatButtonModule, MatIconModule,
    HeaderComponent, StatCardComponent, SectionCardComponent, LoadingSpinnerComponent, ErrorStateComponent, EmptyStateComponent,
    RecentRunsTableComponent,
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboard
      .loadSummary()
      .pipe(
        catchError((err: Error) => {
          this.error.set(err.message || 'Unable to load dashboard data.');
          this.notify.error('Unable to load dashboard data.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((s) => this.summary.set(s));
  }
}
