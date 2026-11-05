import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProfileScopeComponent } from '@features/profiles';
import { SectionCardComponent } from '@shared';
import { RecommendationListComponent } from '../../components/recommendation-list/recommendation-list.component';

@Component({
  selector: 'app-recommendations',
  imports: [ProfileScopeComponent, SectionCardComponent, RecommendationListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-profile-scope title="Recommendations" subtitle="Content recommendations for a business profile." [profile]="profile()">
      <ng-template let-uuid>
        <app-section-card><app-recommendation-list [profileUuid]="uuid" /></app-section-card>
      </ng-template>
    </app-profile-scope>
  `,
})
export class RecommendationsComponent {
  /** Optional `?profile=` query param, bound via withComponentInputBinding(). */
  readonly profile = input<string | undefined>(undefined);
}
