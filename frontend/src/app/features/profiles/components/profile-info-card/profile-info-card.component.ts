import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { SectionCardComponent, StatusBadgeComponent, formatDateTime } from '@shared';
import { BusinessProfile } from '../../models/profile.model';

@Component({
  selector: 'app-profile-info-card',
  imports: [MatChipsModule, SectionCardComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-section-card heading="Business profile">
      <dl class="kv-list">
        <dt>Business name</dt><dd>{{ profile().name || '—' }}</dd>
        <dt>Domain</dt><dd>{{ profile().domain || '—' }}</dd>
        <dt>Industry</dt><dd>{{ profile().industry || '—' }}</dd>
        <dt>Status</dt><dd><app-status-badge [status]="profile().status" /></dd>
        <dt>Created</dt><dd>{{ fmt(profile().created_at) }}</dd>
        <dt>Description</dt><dd class="wrap">{{ profile().description || '—' }}</dd>
        <dt>Competitors</dt>
        <dd>
          @if (profile().competitors.length) {
            <mat-chip-set aria-label="Competitors">
              @for (c of profile().competitors; track c) {
                <mat-chip disableRipple>{{ c }}</mat-chip>
              }
            </mat-chip-set>
          } @else {
            <span class="muted">None added</span>
          }
        </dd>
      </dl>
    </app-section-card>
  `,
})
export class ProfileInfoCardComponent {
  readonly profile = input.required<BusinessProfile>();
  protected readonly fmt = formatDateTime;
}
