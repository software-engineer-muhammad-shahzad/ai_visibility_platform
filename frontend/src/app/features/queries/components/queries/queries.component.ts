import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProfileScopeComponent } from '@features/profiles';
import { SectionCardComponent } from '@shared';
import { OpportunityChartComponent } from '../../components/opportunity-chart/opportunity-chart.component';
import { QueryListComponent } from '../../components/query-list/query-list.component';

@Component({
  selector: 'app-queries',
  imports: [ProfileScopeComponent, SectionCardComponent, QueryListComponent, OpportunityChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-profile-scope title="Queries" subtitle="Discovered search queries for a business profile." [profile]="profile()">
      <ng-template let-uuid>
        <app-section-card><app-query-list [profileUuid]="uuid" /></app-section-card>
        <app-section-card><app-opportunity-chart [profileUuid]="uuid" /></app-section-card>
      </ng-template>
    </app-profile-scope>
  `,
})
export class QueriesComponent {
  /** Optional `?profile=` query param, bound via withComponentInputBinding(). */
  readonly profile = input<string | undefined>(undefined);
}
