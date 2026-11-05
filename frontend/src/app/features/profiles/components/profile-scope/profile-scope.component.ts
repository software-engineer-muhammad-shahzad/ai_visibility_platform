import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, TemplateRef, computed, contentChild, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { EmptyStateComponent, ErrorStateComponent, HeaderComponent, LoadingSpinnerComponent, SectionCardComponent } from '@shared';
import { EMPTY, catchError, finalize } from 'rxjs';
import { BusinessProfile } from '../../models/profile.model';
import { ProfileService } from '../../services/profile.service';
import { ProfilePickerComponent } from '../profile-picker/profile-picker.component';

/**
 * Page frame for features whose API is profile-scoped (queries, recommendations): header, loading /
 * error / empty states, a profile picker fed by GET /profiles, and the page body rendered for the
 * chosen profile. The body is an `<ng-template let-uuid>` receiving the selected profile UUID:
 *
 * <app-profile-scope title="Queries" subtitle="..." [profile]="profile()">
 *   <ng-template let-uuid><app-query-list [profileUuid]="uuid" /></ng-template>
 * </app-profile-scope>
 */
@Component({
  selector: 'app-profile-scope',
  imports: [
    NgTemplateOutlet, RouterLink, MatButtonModule, HeaderComponent, EmptyStateComponent, ErrorStateComponent,
    LoadingSpinnerComponent, SectionCardComponent, ProfilePickerComponent,
  ],
  template: `
    <div class="page">
      <app-header [title]="title()" [subtitle]="subtitle()" />
      @if (loading()) {
        <div class="card card-pad"><app-loading-spinner variant="skeleton" /></div>
      } @else if (error(); as err) {
        <div class="card"><app-error-state title="Unable to load business profiles" [message]="err" (retry)="load()" /></div>
      } @else if (profiles().length === 0) {
        <div class="card">
          <app-empty-state icon="business_center" title="No business profiles yet" message="Create a business profile, then run the pipeline to see results here.">
            <a mat-flat-button routerLink="/profiles/new">Create profile</a>
          </app-empty-state>
        </div>
      } @else {
        <div class="stack">
          <app-section-card>
            <app-profile-picker [entries]="entries()" [value]="selected()" (selected)="select($event)" />
          </app-section-card>
          @if (selected(); as id) {
            <ng-container [ngTemplateOutlet]="body()" [ngTemplateOutletContext]="{ $implicit: id }" />
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileScopeComponent {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = input.required<string>();
  readonly subtitle = input('');
  /** Optional `?profile=` query param value (bound by the routed page). */
  readonly profile = input<string | undefined>(undefined);

  protected readonly body = contentChild.required(TemplateRef);

  protected readonly profiles = signal<BusinessProfile[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly entries = computed(() => this.profiles().map((p) => ({ uuid: p.uuid, name: p.name, lastRun: null })));
  protected readonly selected = computed(() => {
    const list = this.profiles();
    return list.find((p) => p.uuid === this.profile())?.uuid ?? list[0]?.uuid ?? null;
  });

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

  protected select(uuid: string): void {
    void this.router.navigate([], { queryParams: { profile: uuid }, queryParamsHandling: 'merge' });
  }
}
