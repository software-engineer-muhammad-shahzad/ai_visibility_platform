import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmptyStateComponent, LoadingSpinnerComponent, SectionCardComponent, StatusBadgeComponent, formatDateTime } from '@shared';
import { PipelineRun } from '../../models/pipeline-run.model';

@Component({
  selector: 'app-pipeline-summary-card',
  imports: [
    DecimalPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, SectionCardComponent, StatusBadgeComponent,
    LoadingSpinnerComponent, EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-section-card heading="Pipeline summary">
      @if (run(); as r) {
        <dl class="kv-list">
          <dt>Status</dt>
          <dd>
            <app-status-badge [status]="status()" />
            @if (running()) { <mat-spinner diameter="16" class="inline" /> }
          </dd>
          <dt>Stages</dt>
          <dd class="stages">
            @for (s of stages(); track s.key) {
              <span class="stage"><span class="muted">{{ s.label }}</span> <app-status-badge [status]="s.status" /></span>
            }
          </dd>
          <dt>Queries discovered</dt><dd>{{ r.queries_discovered ?? '—' }}</dd>
          <dt>Queries scored</dt><dd>{{ r.queries_scored ?? '—' }}</dd>
          <dt>Tokens used</dt><dd>{{ r.tokens_used === null ? '—' : (r.tokens_used | number) }}</dd>
          <dt>Started</dt><dd>{{ fmt(r.started_at) }}</dd>
          <dt>Completed</dt><dd>{{ fmt(r.completed_at) }}</dd>
        </dl>
        @if (r.error_message) {
          <p class="run-error" role="alert"><mat-icon>error_outline</mat-icon> {{ r.error_message }}</p>
        }
        @if (canRetry()) {
          <button mat-stroked-button class="retry" (click)="retry.emit()">
            <mat-icon>refresh</mat-icon> {{ retryText() }}
          </button>
        }
      } @else if (running()) {
        <app-loading-spinner label="Pipeline starting…" />
      } @else {
        <app-empty-state
          icon="play_circle"
          title="No pipeline run yet"
          message="Run the pipeline to discover queries, score opportunities and generate recommendations."
        />
      }
    </app-section-card>
  `,
  styles: `
    .retry { margin-top: 12px; }
    .stages { display: flex; flex-direction: column; gap: 6px; }
    .stage { display: flex; gap: 8px; align-items: center; }
    .inline { display: inline-block; vertical-align: middle; margin-left: 8px; }
    .run-error { display: flex; gap: 6px; align-items: center; margin: 12px 0 0; padding: 8px 10px; border-radius: 8px; background: var(--danger-bg); color: var(--danger); font-size: 13px; }
  `,
})
export class PipelineSummaryCardComponent {
  readonly run = input<PipelineRun | null>(null);
  /** Effective status to display (live profile status while running, else the run's own). */
  readonly status = input<string | null>(null);
  readonly running = input(false);
  /** Show a retry button (last run failed or only partly succeeded). */
  readonly canRetry = input(false);
  readonly retry = output<void>();
  protected readonly fmt = formatDateTime;

  protected readonly stages = computed(() => {
    const r = this.run();
    return [
      { key: 'discovery', label: '1 · Discovery', status: r?.discovery_status ?? null },
      { key: 'scoring', label: '2 · Scoring', status: r?.scoring_status ?? null },
      { key: 'recommendation', label: '3 · Recommendations', status: r?.recommendation_status ?? null },
    ];
  });
  protected readonly retryText = computed(() => {
    const stage = this.run()?.failed_stage;
    return stage ? `Retry from ${stage} stage` : 'Retry pipeline';
  });
}
