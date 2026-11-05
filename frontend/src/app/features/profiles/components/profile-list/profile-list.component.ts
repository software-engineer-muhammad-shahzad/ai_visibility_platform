import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  EmptyStateComponent, ErrorStateComponent, HeaderComponent, LoadingSpinnerComponent, SectionCardComponent, StatusBadgeComponent,
  formatDateTime,
} from '@shared';
import { catchError, EMPTY, finalize } from 'rxjs';
import { BusinessProfile } from '../../models/profile.model';
import { ProfileService } from '../../services/profile.service';

/** Lists every business profile stored by the API (GET /profiles). */
@Component({
  selector: 'app-profile-list',
  imports: [
    RouterLink, MatButtonModule, MatChipsModule, MatIconModule,
    HeaderComponent, EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent, SectionCardComponent, StatusBadgeComponent,
  ],
  template: `
    <div class="page">
      <app-header title="Business Profiles" subtitle="All business profiles registered in the platform.">
        <a mat-flat-button routerLink="/profiles/new"><mat-icon>add</mat-icon> New profile</a>
      </app-header>

      @if (loading()) {
        <div class="card card-pad"><app-loading-spinner variant="skeleton" /></div>
      } @else if (error(); as err) {
        <div class="card"><app-error-state title="Unable to load business profiles" [message]="err" (retry)="load()" /></div>
      } @else {
        <app-section-card>
          @if (profiles().length === 0) {
            <app-empty-state icon="business_center" title="No profiles yet" message="Create a business profile to get started.">
              <a mat-flat-button routerLink="/profiles/new">Create profile</a>
            </app-empty-state>
          } @else {
            <ul class="list">
              @for (p of profiles(); track p.uuid) {
                <li>
                  <div class="main">
                    <a [routerLink]="['/profiles', p.uuid]" class="name">{{ p.name }}</a>
                    <span class="muted meta">{{ p.domain }}@if (p.industry) { · {{ p.industry }} }</span>
                    @if (p.competitors.length) {
                      <mat-chip-set aria-label="Competitors">
                        @for (c of p.competitors; track c) {
                          <mat-chip disableRipple>{{ c }}</mat-chip>
                        }
                      </mat-chip-set>
                    }
                  </div>
                  <span class="muted created">{{ fmt(p.created_at) }}</span>
                  <app-status-badge [status]="p.status" />
                  <a mat-stroked-button [routerLink]="['/profiles', p.uuid]">View</a>
                </li>
              }
            </ul>
          }
        </app-section-card>
      }
    </div>
  `,
  styles: `
    .list { list-style: none; margin: 0; padding: 0; }
    .list li { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .list li:last-child { border-bottom: 0; }
    .main { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 4px; }
    .name { font-weight: 600; text-decoration: none; }
    .meta, .created { font-size: 13px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileListComponent {
  private readonly profileService = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profiles = signal<BusinessProfile[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly fmt = formatDateTime;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.profileService
      .listProfiles()
      .pipe(
        catchError((err: Error) => {
          this.error.set(err.message || 'Unable to load business profiles.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => this.profiles.set(list));
  }
}
