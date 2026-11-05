import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { StatusBadgeComponent, formatDateTime } from '@shared';
import { DashboardRun } from '../../models/dashboard.model';

@Component({
  selector: 'app-recent-runs-table',
  imports: [DecimalPipe, RouterLink, MatTableModule, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrap">
      <table mat-table [dataSource]="runs()">
        <ng-container matColumnDef="business">
          <th mat-header-cell *matHeaderCellDef>Business</th>
          <td mat-cell *matCellDef="let r"><a [routerLink]="['/profiles', r.profile_uuid]">{{ r.business_name || r.profile_uuid }}</a></td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let r"><app-status-badge [status]="r.status" /></td>
        </ng-container>
        <ng-container matColumnDef="discovered">
          <th mat-header-cell *matHeaderCellDef>Queries discovered</th>
          <td mat-cell *matCellDef="let r">{{ r.queries_discovered ?? '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="scored">
          <th mat-header-cell *matHeaderCellDef>Queries scored</th>
          <td mat-cell *matCellDef="let r">{{ r.queries_scored ?? '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="tokens">
          <th mat-header-cell *matHeaderCellDef>Tokens used</th>
          <td mat-cell *matCellDef="let r">{{ r.tokens_used === null ? '—' : (r.tokens_used | number) }}</td>
        </ng-container>
        <ng-container matColumnDef="started">
          <th mat-header-cell *matHeaderCellDef>Started</th>
          <td mat-cell *matCellDef="let r">{{ fmt(r.started_at) }}</td>
        </ng-container>
        <ng-container matColumnDef="completed">
          <th mat-header-cell *matHeaderCellDef>Completed</th>
          <td mat-cell *matCellDef="let r">{{ fmt(r.completed_at) }}</td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </div>
  `,
})
export class RecentRunsTableComponent {
  readonly runs = input.required<readonly DashboardRun[]>();
  protected readonly columns = ['business', 'status', 'discovered', 'scored', 'tokens', 'started', 'completed'];
  protected readonly fmt = formatDateTime;
}
